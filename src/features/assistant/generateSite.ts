import type { DesignSystem, Project } from '../../app/types';
import { CLEAN_PRESET, withoutPresetId } from '../../presets/presets';
import { designSystemFromBrief, parseDesignBrief } from '../design-system/designFromBrief';
import { loadFontList, type FontFamily } from '../design-system/fontList';
import { ensureIconSets, ensureProjectIconSets } from '../icons/ensureIconSets';
import {
  buildSiteProject,
  withKnownMapAddresses,
  withRenderableBlocks,
  type SiteWriting,
} from './buildSite';
import { AssistantError, type JsonAnswer, type Usage } from './openRouter';
import { withSiteImages, type ImageProgress, type Painter } from './siteImages';
import {
  clarifyRequest,
  DEFAULT_SITE_SIZE,
  designRequest,
  pageParts,
  pageRequest,
  parseClarification,
  parseSections,
  parseSitePlan,
  planRequest,
  sharedRequest,
  type Clarification,
  type PagePart,
  type PagePlan,
  type SectionWriting,
  type SitePlan,
  type SiteSize,
  type StepRequest,
} from './siteSteps';

export type Ask = (request: StepRequest, signal: AbortSignal) => Promise<JsonAnswer>;

type Written = readonly SectionWriting[] | null;

export type SiteDraft = {
  brief: string;
  size: SiteSize;
  look: DesignSystem | null;
  plan: SitePlan | null;
  written: Readonly<Record<string, Written>>;
  images: (ImageProgress & { isFinished: boolean }) | null;
  usage: Usage;
};

export type BuildProgress = {
  draft: SiteDraft;
  working: readonly string[];
  site: Project | null;
  changedPage: string | null;
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

type WritingPart = { id: string; stepId: string; count: number; pagePart: PagePart | null };

type BuildRun = {
  draft(): SiteDraft;
  ask(stepId: string, request: StepRequest): Promise<unknown>;
  started(stepId: string): void;
  ended(stepId: string): void;
  update(changes: Partial<SiteDraft>, page: string | null): void;
  painted(changes: Partial<SiteDraft>, paintedSite: Project, page: string | null): void;
};

export const SHARED_ID = 'shared';
export const PARTS_AT_ONCE = 8;

const DESIGN_ID = 'design';
const PLAN_ID = 'plan';
const IMAGES_ID = 'images';
const ASSEMBLE_ID = 'assemble';
const SHARED_SECTION_COUNT = 2;
const FATAL_KINDS = ['cancelled', 'key', 'credit', 'network'];

const NO_USAGE: Usage = { tokens: 0, cost: 0 };
const NO_IMAGES = { done: 0, total: 0, isFinished: false };
const UNWRITTEN: SectionWriting = { kind: 'unwritten' };

export function emptyDraft(brief: string, size: SiteSize = DEFAULT_SITE_SIZE): SiteDraft {
  return { brief, size, look: null, plan: null, written: {}, images: null, usage: NO_USAGE };
}

function addUsage(total: Usage, added: Usage): Usage {
  return { tokens: total.tokens + added.tokens, cost: total.cost + added.cost };
}

export async function clarifySite(
  ask: Ask,
  description: string,
  signal: AbortSignal,
): Promise<{ clarification: Clarification; usage: Usage }> {
  const answer = await ask(clarifyRequest(description), signal);
  const clarification = parseClarification(answer.value);
  const brief = clarification.brief === '' ? description : clarification.brief;
  return { clarification: { ...clarification, brief }, usage: answer.usage };
}

function pageStepId(page: PagePlan): string {
  return `page:${page.slug}`;
}

function writingParts(plan: SitePlan): WritingPart[] {
  const parts: WritingPart[] = [];
  for (const [pageIndex, page] of plan.pages.entries()) {
    const stepId = pageStepId(page);
    for (const pagePart of pageParts(page)) {
      parts.push({ id: `${stepId}:${pagePart.first}`, stepId, count: pagePart.count, pagePart });
    }
    const isHome = pageIndex === 0;
    if (isHome) {
      parts.push({
        id: SHARED_ID,
        stepId: SHARED_ID,
        count: SHARED_SECTION_COUNT,
        pagePart: null,
      });
    }
  }
  return parts;
}

function sectionsOf(draft: SiteDraft, part: WritingPart): (SectionWriting | null)[] {
  const written = draft.written[part.id];
  const sections: (SectionWriting | null)[] = [];
  for (let index = 0; index < part.count; index += 1) {
    if (written === undefined) {
      sections.push(UNWRITTEN);
    } else if (written === null) {
      sections.push(null);
    } else {
      sections.push(written[index] ?? null);
    }
  }
  return sections;
}

function siteWriting(draft: SiteDraft, plan: SitePlan): SiteWriting {
  const pages: Record<string, (SectionWriting | null)[]> = {};
  let shared: (SectionWriting | null)[] = [];
  for (const part of writingParts(plan)) {
    if (part.pagePart === null) {
      shared = sectionsOf(draft, part);
      continue;
    }
    const { slug } = part.pagePart.page;
    const pageSections = pages[slug] ?? [];
    pageSections.push(...sectionsOf(draft, part));
    pages[slug] = pageSections;
  }
  return { shared, pages };
}

function siteOf(draft: SiteDraft, plan: SitePlan): Project {
  const look = draft.look ?? withoutPresetId(structuredClone(CLEAN_PRESET.designSystem));
  const project = buildSiteProject(plan, look, siteWriting(draft, plan));
  return withRenderableBlocks(withKnownMapAddresses(project, draft.brief));
}

function defaultedPages(draft: SiteDraft, plan: SitePlan): string[] {
  const names: string[] = [];
  for (const part of writingParts(plan)) {
    if (part.pagePart === null || draft.written[part.id] !== null) continue;
    const { name } = part.pagePart.page;
    if (!names.includes(name)) names.push(name);
  }
  return names;
}

function stepStatus(isDone: boolean, isWorking: boolean): StepStatus {
  if (isDone) {
    return 'done';
  } else if (isWorking) {
    return 'working';
  } else {
    return 'waiting';
  }
}

function writingStep(
  id: string,
  label: string,
  parts: readonly WritingPart[],
  draft: SiteDraft,
  working: readonly string[],
): BuildStep {
  let isDone = true;
  let isWorking = false;
  for (const part of parts) {
    if (part.stepId !== id) continue;
    if (!(part.id in draft.written)) isDone = false;
    if (working.includes(part.id)) isWorking = true;
  }
  return { id, label, status: stepStatus(isDone, isWorking) };
}

export function buildSteps(draft: SiteDraft, working: readonly string[]): BuildStep[] {
  const steps: BuildStep[] = [
    {
      id: DESIGN_ID,
      label: 'Designing the look',
      status: stepStatus(draft.look !== null, working.includes(DESIGN_ID)),
    },
    {
      id: PLAN_ID,
      label: 'Planning the pages',
      status: stepStatus(draft.plan !== null, working.includes(PLAN_ID)),
    },
  ];
  if (draft.plan !== null) {
    const parts = writingParts(draft.plan);
    const sharedLabel = 'Writing the navigation and footer';
    steps.push(writingStep(SHARED_ID, sharedLabel, parts, draft, working));
    for (const page of draft.plan.pages) {
      steps.push(writingStep(pageStepId(page), `Writing ${page.name}`, parts, draft, working));
    }
  }
  if (draft.images !== null) {
    const { done, total, isFinished } = draft.images;
    const label = total === 0 ? 'Creating images' : `Creating images (${done} of ${total})`;
    steps.push({
      id: IMAGES_ID,
      label,
      status: stepStatus(isFinished, working.includes(IMAGES_ID)),
    });
  }
  steps.push({
    id: ASSEMBLE_ID,
    label: 'Putting it together',
    status: stepStatus(false, working.includes(ASSEMBLE_ID)),
  });
  return steps;
}

export function buildStage(draft: SiteDraft, working: readonly string[]): BuildStage {
  if (working.includes(ASSEMBLE_ID)) {
    return 'assemble';
  } else if (working.includes(IMAGES_ID)) {
    return 'images';
  } else if (draft.look === null) {
    return 'design';
  } else if (draft.plan === null) {
    return 'plan';
  } else {
    return 'writing';
  }
}

function createBuildRun(
  ask: Ask,
  start: SiteDraft,
  signal: AbortSignal,
  onChange: (progress: BuildProgress) => void,
): BuildRun {
  let draft = start;
  let site = draft.plan === null ? null : siteOf(draft, draft.plan);
  let changedPage: string | null = null;
  const working = new Set<string>();

  function report(): void {
    onChange({ draft, working: [...working], site, changedPage });
  }

  function currentDraft(): SiteDraft {
    return draft;
  }

  function started(stepId: string): void {
    working.add(stepId);
    report();
  }

  function ended(stepId: string): void {
    working.delete(stepId);
    report();
  }

  async function askStep(stepId: string, request: StepRequest): Promise<unknown> {
    if (signal.aborted) throw new AssistantError('cancelled', 'Cancelled.');
    started(stepId);
    try {
      const answer = await ask(request, signal);
      draft = { ...draft, usage: addUsage(draft.usage, answer.usage) };
      return answer.value;
    } finally {
      working.delete(stepId);
    }
  }

  function update(changes: Partial<SiteDraft>, page: string | null): void {
    draft = { ...draft, ...changes };
    site = draft.plan === null ? null : siteOf(draft, draft.plan);
    if (page !== null) changedPage = page;
    report();
  }

  function painted(changes: Partial<SiteDraft>, paintedSite: Project, page: string | null): void {
    draft = { ...draft, ...changes };
    site = { ...paintedSite };
    if (page !== null) changedPage = page;
    report();
  }

  return { draft: currentDraft, ask: askStep, started, ended, update, painted };
}

async function designLook(run: BuildRun, fontList: readonly FontFamily[]): Promise<void> {
  if (run.draft().look !== null) return;
  const answer = await run.ask(DESIGN_ID, designRequest(run.draft().brief));
  const base = withoutPresetId(structuredClone(CLEAN_PRESET.designSystem));
  const look = designSystemFromBrief(base, fontList, parseDesignBrief(answer));
  await ensureIconSets([look.iconSet]);
  run.update({ look }, null);
}

async function planPages(run: BuildRun): Promise<SitePlan> {
  const { brief, size, plan: knownPlan } = run.draft();
  if (knownPlan !== null) return knownPlan;
  const plan = parseSitePlan(await run.ask(PLAN_ID, planRequest(brief, size)));
  run.update({ plan }, null);
  return plan;
}

async function writePart(run: BuildRun, plan: SitePlan, part: WritingPart): Promise<void> {
  const { brief } = run.draft();
  let request = sharedRequest(brief, plan);
  let page: string | null = null;
  if (part.pagePart !== null) {
    request = pageRequest(brief, plan, part.pagePart);
    page = part.pagePart.page.slug;
  }
  let sections: Written;
  try {
    sections = parseSections(await run.ask(part.id, request), part.count);
  } catch (error) {
    const isFatal = !(error instanceof AssistantError) || FATAL_KINDS.includes(error.kind);
    if (isFatal) throw error;
    console.warn(`Writing "${part.id}" failed, so its blocks keep their default text`, error);
    sections = null;
  }
  run.update({ written: { ...run.draft().written, [part.id]: sections } }, page);
}

async function writeText(run: BuildRun, plan: SitePlan): Promise<void> {
  const waiting: WritingPart[] = [];
  for (const part of writingParts(plan)) {
    if (!(part.id in run.draft().written)) waiting.push(part);
  }
  for (let first = 0; first < waiting.length; first += PARTS_AT_ONCE) {
    const batch = waiting.slice(first, first + PARTS_AT_ONCE);
    await Promise.all(batch.map((part) => writePart(run, plan, part)));
  }
}

export async function buildSite(
  ask: Ask,
  start: SiteDraft,
  signal: AbortSignal,
  onChange: (progress: BuildProgress) => void,
  painter: Painter | null = null,
): Promise<BuiltSite> {
  const fontList = await loadFontList();
  const images = painter === null ? null : NO_IMAGES;
  const run = createBuildRun(ask, { ...start, images }, signal, onChange);

  const [plan] = await Promise.all([planPages(run), designLook(run, fontList)]);
  await writeText(run, plan);

  let project = siteOf(run.draft(), plan);
  let failedImages = 0;
  if (painter !== null) {
    run.started(IMAGES_ID);
    const { brief } = run.draft();
    const painting = await withSiteImages(
      project,
      brief,
      painter,
      signal,
      (progress, site, paintedPage) => {
        run.painted({ images: { ...progress, isFinished: false } }, site, paintedPage);
      },
    );
    project = painting.project;
    failedImages = painting.failed;
    const total = painting.made + painting.failed;
    const usage = addUsage(run.draft().usage, painting.usage);
    run.painted({ images: { done: total, total, isFinished: true }, usage }, project, null);
    run.ended(IMAGES_ID);
  }

  run.started(ASSEMBLE_ID);
  await ensureProjectIconSets(project);
  return {
    project,
    draft: run.draft(),
    defaultedPages: defaultedPages(run.draft(), plan),
    failedImages,
  };
}
