import type { Project } from '../../app/types';
import { CLEAN_PRESET, withoutPresetId } from '../../presets/presets';
import {
  designSystemFromBrief,
  parseDesignBrief,
  type DesignBrief,
} from '../design-system/designFromBrief';
import { loadFontList } from '../design-system/fontList';
import { ensureProjectIconSets } from '../icons/ensureIconSets';
import { buildSiteProject, withKnownMapAddresses, withRenderableBlocks } from './buildSite';
import { AssistantError, type JsonAnswer, type Usage } from './openRouter';
import { withSiteImages, type ImageProgress, type Painter } from './siteImages';
import {
  clarifyRequest,
  DEFAULT_SITE_SIZE,
  designRequest,
  pageRequest,
  parseClarification,
  parseSections,
  parseSitePlan,
  planRequest,
  sharedRequest,
  type Answered,
  type Clarification,
  type SectionWriting,
  type SitePlan,
  type SiteSize,
  type StepRequest,
} from './siteSteps';

export type Ask = (request: StepRequest, signal: AbortSignal) => Promise<JsonAnswer>;

export type Written = readonly SectionWriting[] | null;

export type SiteDraft = {
  brief: string;
  size: SiteSize;
  design: DesignBrief | null;
  plan: SitePlan | null;
  written: Readonly<Record<string, Written>>;
  images: (ImageProgress & { isFinished: boolean }) | null;
  usage: Usage;
};

export type BuildStage = 'design' | 'plan' | 'writing' | 'images' | 'assemble';

export type StepStatus = 'waiting' | 'working' | 'done';

export type BuildStep = { id: string; label: string; status: StepStatus };

export type BuiltSite = {
  project: Project;
  draft: SiteDraft;
  defaultedPages: string[];
  failedImages: number;
};

export const SHARED_ID = 'shared';

const DESIGN_ID = 'design';
const PLAN_ID = 'plan';
const IMAGES_ID = 'images';
const ASSEMBLE_ID = 'assemble';
const WRITERS_AT_ONCE = 3;
const FATAL_KINDS = ['cancelled', 'key', 'credit', 'network'];

const NO_USAGE: Usage = { tokens: 0, cost: 0 };

export function emptyDraft(brief: string, size: SiteSize = DEFAULT_SITE_SIZE): SiteDraft {
  return { brief, size, design: null, plan: null, written: {}, images: null, usage: NO_USAGE };
}

export function addUsage(total: Usage, added: Usage): Usage {
  return { tokens: total.tokens + added.tokens, cost: total.cost + added.cost };
}

export async function clarifySite(
  ask: Ask,
  description: string,
  answers: readonly Answered[],
  canAsk: boolean,
  signal: AbortSignal,
): Promise<{ clarification: Clarification; usage: Usage }> {
  const answer = await ask(clarifyRequest(description, answers, canAsk), signal);
  const clarification = parseClarification(answer.value, canAsk);
  const brief = clarification.brief === '' ? description : clarification.brief;
  return { clarification: { ...clarification, brief }, usage: answer.usage };
}

function writingJobs(plan: SitePlan): { id: string; label: string }[] {
  const jobs = [{ id: SHARED_ID, label: 'Writing the navigation and footer' }];
  for (const page of plan.pages) jobs.push({ id: page.slug, label: `Writing ${page.name}` });
  return jobs;
}

export function buildSteps(draft: SiteDraft, working: readonly string[]): BuildStep[] {
  function status(id: string, isDone: boolean): StepStatus {
    if (isDone) return 'done';
    return working.includes(id) ? 'working' : 'waiting';
  }
  const steps: BuildStep[] = [
    {
      id: DESIGN_ID,
      label: 'Designing the look',
      status: status(DESIGN_ID, draft.design !== null),
    },
    { id: PLAN_ID, label: 'Planning the pages', status: status(PLAN_ID, draft.plan !== null) },
  ];
  if (draft.plan !== null) {
    for (const job of writingJobs(draft.plan)) {
      steps.push({ ...job, status: status(job.id, job.id in draft.written) });
    }
  }
  if (draft.images !== null) {
    const { done, total, isFinished } = draft.images;
    const label = total === 0 ? 'Creating images' : `Creating images (${done} of ${total})`;
    steps.push({ id: IMAGES_ID, label, status: status(IMAGES_ID, isFinished) });
  }
  steps.push({
    id: ASSEMBLE_ID,
    label: 'Putting it together',
    status: status(ASSEMBLE_ID, false),
  });
  return steps;
}

export function buildStage(draft: SiteDraft, working: readonly string[]): BuildStage {
  if (working.includes(ASSEMBLE_ID)) {
    return 'assemble';
  } else if (working.includes(IMAGES_ID)) {
    return 'images';
  } else if (draft.design === null) {
    return 'design';
  } else if (draft.plan === null) {
    return 'plan';
  } else {
    return 'writing';
  }
}

export async function buildSite(
  ask: Ask,
  start: SiteDraft,
  signal: AbortSignal,
  onChange: (draft: SiteDraft, working: readonly string[]) => void,
  painter: Painter | null = null,
): Promise<BuiltSite> {
  const noImages = { done: 0, total: 0, isFinished: false };
  let draft: SiteDraft = { ...start, images: painter === null ? null : noImages };
  const working = new Set<string>();

  function report(): void {
    onChange(draft, [...working]);
  }

  async function run(id: string, request: StepRequest): Promise<unknown> {
    if (signal.aborted) throw new AssistantError('cancelled', 'Cancelled.');
    working.add(id);
    report();
    try {
      const answer = await ask(request, signal);
      draft = { ...draft, usage: addUsage(draft.usage, answer.usage) };
      return answer.value;
    } finally {
      working.delete(id);
    }
  }

  if (draft.design === null) {
    const design = parseDesignBrief(await run(DESIGN_ID, designRequest(draft.brief)));
    draft = { ...draft, design };
    report();
  }
  if (draft.plan === null) {
    const plan = parseSitePlan(await run(PLAN_ID, planRequest(draft.brief, draft.size)));
    draft = { ...draft, plan };
    report();
  }
  const { design, plan } = draft;
  if (design === null || plan === null) throw new Error('The site draft lost its design or plan');

  async function write(id: string): Promise<void> {
    const page = plan?.pages.find(({ slug }) => slug === id);
    if (plan === null || (id !== SHARED_ID && page === undefined)) return;
    const request =
      page === undefined ? sharedRequest(draft.brief, plan) : pageRequest(draft.brief, plan, page);
    const count = page === undefined ? 2 : page.sections.length;
    let sections: Written;
    try {
      sections = parseSections(await run(id, request), count);
    } catch (error) {
      const isFatal = !(error instanceof AssistantError) || FATAL_KINDS.includes(error.kind);
      if (isFatal) throw error;
      console.warn(`Writing "${id}" failed, so its blocks keep their default text`, error);
      sections = null;
    }
    draft = { ...draft, written: { ...draft.written, [id]: sections } };
    report();
  }

  const waiting: string[] = [];
  for (const job of writingJobs(plan)) {
    if (!(job.id in draft.written)) waiting.push(job.id);
  }
  let hasFailed = false;
  async function writeNext(): Promise<void> {
    for (let id = waiting.shift(); id !== undefined && !hasFailed; id = waiting.shift()) {
      try {
        await write(id);
      } catch (error) {
        hasFailed = true;
        throw error;
      }
    }
  }
  const writers: Promise<void>[] = [];
  for (let index = 0; index < WRITERS_AT_ONCE; index += 1) writers.push(writeNext());
  await Promise.all(writers);

  working.add(painter === null ? ASSEMBLE_ID : IMAGES_ID);
  report();
  const fontList = await loadFontList();
  const base = withoutPresetId(structuredClone(CLEAN_PRESET.designSystem));
  const designSystem = designSystemFromBrief(base, fontList, design);
  const pages: Record<string, Written> = {};
  const defaultedPages: string[] = [];
  for (const page of plan.pages) {
    const written = draft.written[page.slug] ?? null;
    pages[page.slug] = written;
    if (written === null) defaultedPages.push(page.name);
  }
  const assembled = buildSiteProject(plan, designSystem, {
    shared: draft.written[SHARED_ID] ?? null,
    pages,
  });
  let project = withKnownMapAddresses(assembled, draft.brief);
  let failedImages = 0;
  if (painter !== null) {
    const images = await withSiteImages(project, draft.brief, painter, signal, (progress) => {
      draft = { ...draft, images: { ...progress, isFinished: false } };
      report();
    });
    project = images.project;
    failedImages = images.failed;
    const total = images.made + images.failed;
    draft = {
      ...draft,
      images: { done: total, total, isFinished: true },
      usage: addUsage(draft.usage, images.usage),
    };
    working.delete(IMAGES_ID);
    working.add(ASSEMBLE_ID);
    report();
  }
  await ensureProjectIconSets(project);
  return { project: withRenderableBlocks(project), draft, defaultedPages, failedImages };
}
