import { useEffect, useEffectEvent, useRef, useState, type JSX } from 'react';
import { readAppSettings } from '../../app/appSettings';
import { noticeShown } from '../../app/editorSlice';
import { describeError } from '../../app/errors';
import { editorPath, navigate } from '../../app/router';
import { dispatch } from '../../app/store';
import { putProject } from '../../persistence/db';
import {
  addUsage,
  buildSite,
  buildStage,
  buildSteps,
  clarifySite,
  emptyDraft,
  type BuildStage,
  type BuildStep,
  type BuiltSite,
  type SiteDraft,
  type StepStatus,
} from './generateSite';
import { askForImage, askForJson, AssistantError, type JsonAnswer, type Usage } from './openRouter';
import { fitImage, type Painter } from './siteImages';
import { SiteQuestions } from './SiteQuestions';
import {
  DEFAULT_SITE_SIZE,
  MAX_QUESTION_ROUNDS,
  SITE_SIZES,
  siteSizeOf,
  type Answered,
  type Question,
  type SiteSize,
  type StepRequest,
} from './siteSteps';
import { TypedStatus } from './TypedStatus';
import './assistant.css';
import {
  Button,
  closeDialogOf,
  Dialog,
  DialogActions,
  Icon,
  Title,
} from '../../../packages/ui/src';

type Phase =
  | { kind: 'thinking' }
  | { kind: 'asking'; questions: Question[]; brief: string; hasOwnQuestions: boolean }
  | { kind: 'building' }
  | { kind: 'failed'; message: string; canFixInSettings: boolean; retry: 'clarify' | 'build' };

type GenerateSiteDialogProps = {
  description: string;
  onClose(): void;
  onOpenSettings(): void;
};

const TITLE_ID = 've-generate-site-title';
const NO_USAGE: Usage = { tokens: 0, cost: 0 };
const COST_FORMAT = new Intl.NumberFormat('en', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 4,
});
const TOKEN_FORMAT = new Intl.NumberFormat('en');

const REAL_IMAGES = 'Real images';
const IMAGE_QUESTION: Question = {
  question: 'Real images or placeholders?',
  suggestions: [REAL_IMAGES, 'Placeholders'],
  allowsMany: false,
  recommended: [REAL_IMAGES],
};

const SIZE_QUESTION: Question = {
  question: 'How big should the site be?',
  suggestions: [SITE_SIZES.onePage.label, SITE_SIZES.standard.label, SITE_SIZES.large.label],
  allowsMany: false,
  recommended: [SITE_SIZES[DEFAULT_SITE_SIZE].label],
};

type Choices = { size: SiteSize; withImages: boolean };

const NO_CHOICES: Choices = { size: DEFAULT_SITE_SIZE, withImages: false };

const READING_PHRASES = [
  'Reading your description…',
  'Working out what kind of site this is…',
  'Thinking about who will visit…',
  'Sketching the pages it needs…',
];

const ANSWER_PHRASES = [
  'Thinking about your answers…',
  'Fitting them into the plan…',
  'Checking if anything is still open…',
];

const BUILD_PHRASES: Record<BuildStage, readonly string[]> = {
  design: ['Choosing colors that fit the mood…', 'Pairing fonts…', 'Setting spacing and corners…'],
  plan: [
    'Deciding which pages you need…',
    'Picking the best layout for each section…',
    'Putting the sections in order…',
  ],
  writing: ['Writing your headlines…', 'Finding the right words…', 'Filling in the details…'],
  images: ['Creating your images…', 'Setting the scene…', 'Adjusting the light…'],
  assemble: ['Putting it all together…'],
};

const STATUS_TEXT: Record<StepStatus, string> = {
  waiting: 'waiting',
  working: 'in progress',
  done: 'done',
};

export function usageText(usage: Usage): string {
  const tokens = `${TOKEN_FORMAT.format(usage.tokens)} tokens`;
  return usage.cost > 0 ? `${tokens} (${COST_FORMAT.format(usage.cost)})` : tokens;
}

function StepList({ steps }: { steps: BuildStep[] }): JSX.Element {
  const working: string[] = [];
  for (const step of steps) {
    if (step.status === 'working') working.push(step.label);
  }
  return (
    <>
      <ol className="ve-build-steps">
        {steps.map((step) => (
          <li key={step.id} className="ve-build-step" data-status={step.status}>
            <span className="ve-build-mark" aria-hidden="true">
              {step.status === 'done' && <Icon name="check" />}
            </span>
            <span>{step.label}</span>
            <span className="ve-visually-hidden">: {STATUS_TEXT[step.status]}</span>
          </li>
        ))}
      </ol>
      <p className="ve-visually-hidden" role="status">
        {working.join(', ')}
      </p>
    </>
  );
}

export function GenerateSiteDialog({
  description,
  onClose,
  onOpenSettings,
}: GenerateSiteDialogProps): JSX.Element {
  const [setup] = useState(readAppSettings);
  const [phase, setPhase] = useState<Phase>({ kind: 'thinking' });
  const [answers, setAnswers] = useState<Answered[]>([]);
  const [askedRounds, setAskedRounds] = useState(0);
  const [draft, setDraft] = useState<SiteDraft | null>(null);
  const [working, setWorking] = useState<readonly string[]>([]);
  const [spent, setSpent] = useState<Usage>(NO_USAGE);
  const [choices, setChoices] = useState<Choices>(NO_CHOICES);
  const runRef = useRef<AbortController | null>(null);

  async function ask(request: StepRequest, signal: AbortSignal): Promise<JsonAnswer> {
    if (setup.assistantModel === null) {
      throw new AssistantError('model', 'Pick a model in App settings first.');
    }
    return askForJson(
      {
        key: setup.openRouterKey.trim(),
        model: setup.assistantModel,
        effort: setup.assistantEffort,
        ...request,
      },
      signal,
    );
  }

  function begin(): AbortSignal {
    runRef.current?.abort();
    const run = new AbortController();
    runRef.current = run;
    return run.signal;
  }

  function fail(error: unknown, retry: 'clarify' | 'build'): void {
    if (error instanceof AssistantError && error.kind === 'cancelled') return;
    console.error('Building the site with the assistant failed', error);
    const kind = error instanceof AssistantError ? error.kind : null;
    setPhase({
      kind: 'failed',
      message: describeError(error),
      canFixInSettings: kind === 'key' || kind === 'credit' || setup.assistantModel === null,
      retry,
    });
  }

  async function build(start: SiteDraft, withImages: boolean): Promise<void> {
    const signal = begin();
    setDraft(start);
    setWorking([]);
    setPhase({ kind: 'building' });
    const { imageModel } = setup;
    let painter: Painter | null = null;
    if (withImages && imageModel !== null) {
      painter = {
        paint: (prompt, ratio, paintSignal) =>
          askForImage(
            { key: setup.openRouterKey.trim(), model: imageModel, prompt, aspectRatio: ratio },
            paintSignal,
          ),
        fit: fitImage,
      };
    }
    let built: BuiltSite;
    try {
      built = await buildSite(
        ask,
        start,
        signal,
        (next, active) => {
          setDraft(next);
          setWorking(active);
        },
        painter,
      );
      await putProject(built.project);
    } catch (error) {
      fail(error, 'build');
      return;
    }
    dispatch(noticeShown('info', `Your site is ready. It used ${usageText(built.draft.usage)}.`));
    if (built.defaultedPages.length > 0) {
      const names = built.defaultedPages.join(', ');
      dispatch(
        noticeShown(
          'warning',
          `The text for ${names} could not be written, so those pages show sample text.`,
        ),
      );
    }
    if (built.failedImages === 1) {
      dispatch(noticeShown('warning', '1 image could not be created, so it shows a placeholder.'));
    } else if (built.failedImages > 1) {
      dispatch(
        noticeShown(
          'warning',
          `${built.failedImages} images could not be created, so they show placeholders.`,
        ),
      );
    }
    onClose();
    navigate(editorPath(built.project.id, built.project.pages.homePageId));
  }

  async function clarify(given: Answered[], rounds: number, chosen: Choices): Promise<void> {
    const signal = begin();
    setPhase({ kind: 'thinking' });
    let first: SiteDraft;
    try {
      const canAsk = rounds < MAX_QUESTION_ROUNDS;
      const { clarification, usage } = await clarifySite(ask, description, given, canAsk, signal);
      const used = addUsage(spent, usage);
      setSpent(used);
      const questions = [...clarification.questions];
      if (rounds === 0) questions.push(SIZE_QUESTION);
      if (rounds === 0 && setup.imageModel !== null) questions.push(IMAGE_QUESTION);
      if (questions.length > 0) {
        setAskedRounds(rounds + 1);
        setPhase({
          kind: 'asking',
          questions,
          brief: clarification.brief,
          hasOwnQuestions: clarification.questions.length > 0,
        });
        return;
      }
      first = { ...emptyDraft(clarification.brief, chosen.size), usage: used };
    } catch (error) {
      fail(error, 'clarify');
      return;
    }
    await build(first, chosen.withImages);
  }

  const start = useEffectEvent(() => {
    void clarify([], 0, NO_CHOICES);
  });

  useEffect(() => {
    const timer = setTimeout(start, 0);
    return () => {
      clearTimeout(timer);
      runRef.current?.abort();
    };
  }, []);

  function close(): void {
    runRef.current?.abort();
    onClose();
  }

  function withoutAppAnswers(roundAnswers: Answered[]): { own: Answered[]; chosen: Choices } {
    const own: Answered[] = [];
    let { size, withImages } = choices;
    for (const answered of roundAnswers) {
      if (answered.question === IMAGE_QUESTION.question) {
        withImages = answered.answer.toLowerCase().startsWith('real');
      } else if (answered.question === SIZE_QUESTION.question) {
        size = siteSizeOf(answered.answer);
      } else {
        own.push(answered);
      }
    }
    const chosen = { size, withImages };
    setChoices(chosen);
    return { own, chosen };
  }

  function answerRound(roundAnswers: Answered[]): void {
    if (phase.kind !== 'asking') return;
    const { own, chosen } = withoutAppAnswers(roundAnswers);
    if (!phase.hasOwnQuestions) {
      void build({ ...emptyDraft(phase.brief, chosen.size), usage: spent }, chosen.withImages);
      return;
    }
    const given = [...answers, ...own];
    setAnswers(given);
    void clarify(given, askedRounds, chosen);
  }

  function buildNow(brief: string, roundAnswers: Answered[]): void {
    const { own, chosen } = withoutAppAnswers(roundAnswers);
    if (own.length === 0) {
      void build({ ...emptyDraft(brief, chosen.size), usage: spent }, chosen.withImages);
      return;
    }
    const given = [...answers, ...own];
    setAnswers(given);
    setAskedRounds(MAX_QUESTION_ROUNDS);
    void clarify(given, MAX_QUESTION_ROUNDS, chosen);
  }

  function retry(): void {
    if (phase.kind !== 'failed') return;
    if (phase.retry === 'build' && draft !== null) {
      void build(draft, choices.withImages);
    } else {
      void clarify(answers, askedRounds, choices);
    }
  }

  const isAnswering = phase.kind === 'thinking' && answers.length > 0;

  function title(): string {
    if (phase.kind === 'asking' && phase.questions.length === 1) {
      return 'One quick question';
    } else if (phase.kind === 'asking' || isAnswering) {
      return 'A few quick questions';
    } else {
      return 'Building your site';
    }
  }

  const thinkingPhrases = isAnswering ? ANSWER_PHRASES : READING_PHRASES;

  return (
    <Dialog labelId={TITLE_ID} size="full" className="ve-generate-site" onClose={close}>
      <header className="ve-build-bar">
        <Title id={TITLE_ID}>{title()}</Title>
        <Button onClick={(event) => closeDialogOf(event.currentTarget)}>
          {phase.kind === 'failed' ? 'Close' : 'Cancel'}
        </Button>
      </header>
      {phase.kind === 'asking' && (
        <SiteQuestions
          key={askedRounds}
          questions={phase.questions}
          onDone={answerRound}
          onBuildNow={(roundAnswers) => buildNow(phase.brief, roundAnswers)}
        />
      )}
      {phase.kind !== 'asking' && (
        <div className="ve-build-page">
          {phase.kind === 'thinking' && (
            <div className="ve-build-thinking">
              <span className="ve-build-mark" data-status="working" aria-hidden="true" />
              <TypedStatus key={thinkingPhrases[0]} phrases={thinkingPhrases} />
              <p className="ve-visually-hidden" role="status">
                {thinkingPhrases[0]}
              </p>
            </div>
          )}
          {phase.kind === 'building' && draft !== null && (
            <TypedStatus
              key={buildStage(draft, working)}
              phrases={BUILD_PHRASES[buildStage(draft, working)]}
            />
          )}
          {phase.kind !== 'thinking' && draft !== null && (
            <StepList steps={buildSteps(draft, working)} />
          )}
          {phase.kind === 'failed' && (
            <>
              <p className="ui-field-error" role="alert">
                {phase.message}
              </p>
              <DialogActions>
                {phase.canFixInSettings && (
                  <Button
                    onClick={() => {
                      close();
                      onOpenSettings();
                    }}
                  >
                    Open App settings
                  </Button>
                )}
                <Button variant="primary" onClick={retry}>
                  Try again
                </Button>
              </DialogActions>
            </>
          )}
        </div>
      )}
    </Dialog>
  );
}
