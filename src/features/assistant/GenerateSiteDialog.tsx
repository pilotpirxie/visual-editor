import { useEffect, useEffectEvent, useRef, useState, type JSX } from 'react';
import { readAppSettings, type AppSettings } from '../../app/appSettings';
import { noticeShown } from '../../app/editorSlice';
import { describeError } from '../../app/errors';
import { editorPath, navigate } from '../../app/router';
import { dispatch } from '../../app/store';
import { putProject } from '../../persistence/db';
import {
  buildSite,
  buildStage,
  buildSteps,
  clarifySite,
  emptyDraft,
  type BuildProgress,
  type BuildStage,
  type BuildStep,
  type BuiltSite,
  type SiteDraft,
  type StepStatus,
} from './generateSite';
import { askForImage, askForJson, AssistantError, type JsonAnswer, type Usage } from './openRouter';
import { fitImage, type Painter } from './siteImages';
import { SitePreview } from './SitePreview';
import { SiteQuestions } from './SiteQuestions';
import {
  briefWithAnswers,
  DEFAULT_SITE_SIZE,
  SITE_SIZES,
  siteSizeOf,
  type Answered,
  type Clarification,
  type Question,
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
  | { kind: 'asking'; questions: Question[]; brief: string; usage: Usage }
  | { kind: 'building' }
  | { kind: 'failed'; message: string; canFixInSettings: boolean; retry: 'clarify' | 'build' };

type GenerateSiteDialogProps = {
  description: string;
  onClose(): void;
  onOpenSettings(): void;
};

const TITLE_ID = 've-generate-site-title';
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

const READING_PHRASES = [
  'Reading your description…',
  'Working out what kind of site this is…',
  'Thinking about who will visit…',
  'Sketching the pages it needs…',
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

function painterFor(setup: AppSettings): Painter | null {
  const { imageModel } = setup;
  if (imageModel === null) return null;
  const key = setup.openRouterKey.trim();
  return {
    paint: (prompt, ratio, signal) =>
      askForImage({ key, model: imageModel, prompt, aspectRatio: ratio }, signal),
    fit: fitImage,
  };
}

function showBuildNotices(built: BuiltSite): void {
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
}

function askWith(
  setup: AppSettings,
  request: StepRequest,
  signal: AbortSignal,
): Promise<JsonAnswer> {
  if (setup.assistantModel === null) {
    return Promise.reject(new AssistantError('model', 'Pick a model in App settings first.'));
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

function failedPhase(error: unknown, retry: 'clarify' | 'build', setup: AppSettings): Phase {
  const kind = error instanceof AssistantError ? error.kind : null;
  return {
    kind: 'failed',
    message: describeError(error),
    canFixInSettings: kind === 'key' || kind === 'credit' || setup.assistantModel === null,
    retry,
  };
}

function questionsFor(clarification: Clarification, setup: AppSettings): Question[] {
  const questions = [...clarification.questions, SIZE_QUESTION];
  if (setup.imageModel !== null) questions.push(IMAGE_QUESTION);
  return questions;
}

type BuildChoice = { draft: SiteDraft; withImages: boolean };

function buildChoiceOf(brief: string, usage: Usage, given: readonly Answered[]): BuildChoice {
  const own: Answered[] = [];
  let size = DEFAULT_SITE_SIZE;
  let withImages = false;
  for (const answered of given) {
    if (answered.question === SIZE_QUESTION.question) {
      size = siteSizeOf(answered.answer);
    } else if (answered.question === IMAGE_QUESTION.question) {
      withImages = answered.answer.toLowerCase().startsWith('real');
    } else {
      own.push(answered);
    }
  }
  return { draft: { ...emptyDraft(briefWithAnswers(brief, own), size), usage }, withImages };
}

function titleOf(phase: Phase): string {
  if (phase.kind === 'asking' && phase.questions.length === 1) {
    return 'One quick question';
  } else if (phase.kind === 'asking') {
    return 'A few quick questions';
  } else {
    return 'Building your site';
  }
}

type SiteBuild = {
  phase: Phase;
  progress: BuildProgress | null;
  buildFromAnswers(given: readonly Answered[]): void;
  retry(): void;
  close(): void;
};

function useSiteBuild(description: string, onClose: () => void): SiteBuild {
  const [setup] = useState(readAppSettings);
  const [phase, setPhase] = useState<Phase>({ kind: 'thinking' });
  const [progress, setProgress] = useState<BuildProgress | null>(null);
  const [wantsImages, setWantsImages] = useState(false);
  const runRef = useRef<AbortController | null>(null);

  function ask(request: StepRequest, signal: AbortSignal): Promise<JsonAnswer> {
    return askWith(setup, request, signal);
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
    setPhase(failedPhase(error, retry, setup));
  }

  async function clarify(): Promise<void> {
    const signal = begin();
    setPhase({ kind: 'thinking' });
    let clarified: { clarification: Clarification; usage: Usage };
    try {
      clarified = await clarifySite(ask, description, signal);
    } catch (error) {
      fail(error, 'clarify');
      return;
    }
    const { clarification, usage } = clarified;
    const questions = questionsFor(clarification, setup);
    setPhase({ kind: 'asking', questions, brief: clarification.brief, usage });
  }

  async function build(start: SiteDraft, withImages: boolean): Promise<void> {
    const signal = begin();
    setWantsImages(withImages);
    setProgress((shown) => ({
      draft: start,
      working: [],
      site: shown?.site ?? null,
      changedPage: shown?.changedPage ?? null,
    }));
    setPhase({ kind: 'building' });
    const painter = withImages ? painterFor(setup) : null;
    let built: BuiltSite;
    try {
      built = await buildSite(ask, start, signal, setProgress, painter);
      await putProject(built.project);
    } catch (error) {
      fail(error, 'build');
      return;
    }
    showBuildNotices(built);
    onClose();
    navigate(editorPath(built.project.id, built.project.pages.homePageId));
  }

  function buildFromAnswers(given: readonly Answered[]): void {
    if (phase.kind !== 'asking') return;
    const { draft, withImages } = buildChoiceOf(phase.brief, phase.usage, given);
    void build(draft, withImages);
  }

  const start = useEffectEvent(() => {
    void clarify();
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

  function retry(): void {
    if (phase.kind !== 'failed') return;
    if (phase.retry === 'build' && progress !== null) {
      void build(progress.draft, wantsImages);
    } else {
      void clarify();
    }
  }

  return { phase, progress, buildFromAnswers, retry, close };
}

type BuildStatusProps = {
  phase: Phase;
  progress: BuildProgress | null;
  onRetry(): void;
  onOpenSettings(): void;
};

function BuildStatus({ phase, progress, onRetry, onOpenSettings }: BuildStatusProps): JSX.Element {
  return (
    <div className="ve-build-status">
      {phase.kind === 'thinking' && (
        <div className="ve-build-thinking">
          <span className="ve-build-mark" data-status="working" aria-hidden="true" />
          <TypedStatus phrases={READING_PHRASES} />
          <p className="ve-visually-hidden" role="status">
            {READING_PHRASES[0]}
          </p>
        </div>
      )}
      {phase.kind === 'building' && progress !== null && (
        <TypedStatus
          key={buildStage(progress.draft, progress.working)}
          phrases={BUILD_PHRASES[buildStage(progress.draft, progress.working)]}
        />
      )}
      {progress !== null && <StepList steps={buildSteps(progress.draft, progress.working)} />}
      {phase.kind === 'failed' && (
        <>
          <p className="ui-field-error" role="alert">
            {phase.message}
          </p>
          <DialogActions>
            {phase.canFixInSettings && <Button onClick={onOpenSettings}>Open App settings</Button>}
            <Button variant="primary" onClick={onRetry}>
              Try again
            </Button>
          </DialogActions>
        </>
      )}
    </div>
  );
}

export function GenerateSiteDialog({
  description,
  onClose,
  onOpenSettings,
}: GenerateSiteDialogProps): JSX.Element {
  const { phase, progress, buildFromAnswers, retry, close } = useSiteBuild(description, onClose);

  function openSettings(): void {
    close();
    onOpenSettings();
  }

  return (
    <Dialog labelId={TITLE_ID} size="full" className="ve-generate-site" onClose={close}>
      <header className="ve-build-bar">
        <Title id={TITLE_ID}>{titleOf(phase)}</Title>
        <Button onClick={(event) => closeDialogOf(event.currentTarget)}>
          {phase.kind === 'failed' ? 'Close' : 'Cancel'}
        </Button>
      </header>
      {phase.kind === 'asking' && (
        <SiteQuestions
          questions={phase.questions}
          onDone={buildFromAnswers}
          onBuildNow={buildFromAnswers}
        />
      )}
      {phase.kind !== 'asking' && (
        <div className="ve-build-page" data-layout={progress === null ? 'centered' : 'preview'}>
          <BuildStatus
            phase={phase}
            progress={progress}
            onRetry={retry}
            onOpenSettings={openSettings}
          />
          {progress !== null && (
            <SitePreview
              look={progress.draft.look}
              site={progress.site}
              changedPage={progress.changedPage}
            />
          )}
        </div>
      )}
    </Dialog>
  );
}
