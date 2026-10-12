import { beforeEach, describe, expect, it, vi } from 'vitest';
import { parseProjectDocument } from '../../persistence/validateProject';
import { builtInComponents } from '../../components/registry';
import { UNWRITTEN_CLASS } from './buildSite';
import {
  buildSite,
  buildStage,
  buildSteps,
  clarifySite,
  emptyDraft,
  PARTS_AT_ONCE,
  SHARED_ID,
  type Ask,
  type BuildProgress,
  type SiteDraft,
} from './generateSite';
import { AssistantError, type JsonAnswer } from './openRouter';
import type { Painter } from './siteImages';
import type { StepRequest } from './siteSteps';

const USAGE = { tokens: 100, cost: 0.01 };

const DESIGN = {
  colors: {
    background: '#fff8f0',
    surface: '#f7ecdf',
    border: '#e6d5c3',
    text: '#2b1d14',
    mutedText: '#6f5b4d',
    primary: '#b4451f',
    darkBackground: '#2b1d14',
    accent: '#f6b26b',
  },
  headingFont: 'Fraunces',
  bodyFont: 'Work Sans',
  headingWeight: 600,
  typeScale: 'balanced',
  baseSizePx: 16,
  spacing: 'regular',
  corners: 'large',
  shadows: 'soft',
  iconSet: 'phosphor',
};

const PLAN = {
  title: 'Crumb & Co',
  description: 'A bakery.',
  language: 'en',
  header: 'nav-simple',
  footer: 'footer-simple',
  pages: [
    {
      name: 'Home',
      slug: 'home',
      purpose: 'Welcome',
      sections: [{ block: 'hero-centered', custom: '', theme: 'default', note: '' }],
    },
    {
      name: 'Menu',
      slug: 'menu',
      purpose: 'Prices',
      sections: [{ block: 'pricing-3-plans', custom: '', theme: 'default', note: '' }],
    },
    {
      name: 'Visit',
      slug: 'visit',
      purpose: 'Find us',
      sections: [{ block: 'faq-accordion', custom: '', theme: 'default', note: '' }],
    },
  ],
};

type Handler = (request: StepRequest) => unknown;

type PlannedSection = { block: string; custom: string; theme: string; note: string };

const STEP_IDS = ['design', 'plan', 'images', 'assemble'];

function featureSections(count: number): PlannedSection[] {
  const sections: PlannedSection[] = [];
  for (const { definition } of builtInComponents.values()) {
    if (sections.length === count) break;
    if (definition.category !== 'features') continue;
    sections.push({ block: definition.id, custom: '', theme: 'default', note: '' });
  }
  return sections;
}

function stepOf(request: StepRequest): { step: string; page: string } {
  if (request.schema !== null) return { step: request.schema.name, page: request.schema.name };
  const page = /^Write the content of the page "(?<name>[^"]+)"/.exec(request.user)?.groups?.name;
  if (page === undefined) return { step: SHARED_ID, page: SHARED_ID };
  const range = /Write only sections (?<first>\d+) to (?<last>\d+)/.exec(request.user)?.groups;
  if (range === undefined) return { step: page, page };
  return { step: `${page} ${range.first}-${range.last}`, page };
}

let asked: string[] = [];
let handlers: Record<string, Handler> = {};

const ask: Ask = async (request, signal) => {
  const { step, page } = stepOf(request);
  asked.push(step);
  await Promise.resolve();
  if (signal.aborted) throw new AssistantError('cancelled', 'Cancelled.');
  const handler = handlers[page];
  const value = handler === undefined ? { sections: [] } : handler(request);
  const answer: JsonAnswer = { value, usage: USAGE };
  return answer;
};

function live(): AbortSignal {
  return new AbortController().signal;
}

function ignore(): void {}

beforeEach(() => {
  asked = [];
  handlers = {
    design_brief: () => DESIGN,
    site_plan: () => PLAN,
    Home: () => ({ sections: [{ values: { title: 'Bread worth getting up for' } }] }),
  };
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

describe('clarifySite', () => {
  it('returns the questions and falls back to the description as the brief', async () => {
    handlers.site_clarification = () => ({ questions: [{ question: 'Where are you?' }] });
    const result = await clarifySite(ask, 'A bakery site', live());
    expect(result.clarification).toEqual({
      isClear: false,
      questions: [
        { question: 'Where are you?', suggestions: [], allowsMany: false, recommended: [] },
      ],
      brief: 'A bakery site',
    });
    expect(result.usage).toEqual(USAGE);
  });
});

describe('buildSite', () => {
  it('designs and plans together, writes every page and builds a valid project', async () => {
    const seen: string[][] = [];
    const built = await buildSite(ask, emptyDraft('A bakery in Leeds'), live(), (progress) => {
      seen.push([...progress.working]);
    });
    expect([...asked.slice(0, 2)].sort()).toEqual(['design_brief', 'site_plan']);
    expect([...asked.slice(2)].sort()).toEqual(['Home', 'Menu', 'Visit', SHARED_ID].sort());
    const saved: unknown = JSON.parse(JSON.stringify(built.project));
    expect(parseProjectDocument(saved)).toEqual(built.project);
    expect(built.project.settings.title).toBe('Crumb & Co');
    expect(built.project.designSystem.tokens['--color-primary'].value).toBe('#b4451f');
    expect(built.project.designSystem.fonts[0].family).toBe('Fraunces');
    expect(built.project.designSystem.iconSet).toBe('phosphor');
    expect(built.project.pages.ids).toHaveLength(3);
    expect(JSON.stringify(built.project.blocks)).toContain('Bread worth getting up for');
    expect(JSON.stringify(built.project.blocks)).not.toContain(UNWRITTEN_CLASS);
    expect(built.defaultedPages).toEqual([]);
    expect(built.draft.usage.tokens).toBe(600);
    expect(built.draft.usage.cost).toBeCloseTo(0.06);
    expect(seen).toContainEqual(['plan', 'design']);
    expect(seen).toContainEqual(['page:home:0', 'shared', 'page:menu:0', 'page:visit:0']);
    expect(seen.at(-1)).toEqual(['assemble']);
  });

  it('reports the planned pages, then the look and the text as they arrive', async () => {
    const reports: BuildProgress[] = [];
    await buildSite(ask, emptyDraft('A bakery'), live(), (progress) => {
      reports.push(progress);
    });
    const sites: string[] = [];
    for (const { site } of reports) {
      if (site !== null) sites.push(JSON.stringify(site.blocks));
    }
    expect(reports[0].site).toBeNull();
    expect(sites[0]).toContain(UNWRITTEN_CLASS);
    expect(sites[0]).not.toContain('Bread worth getting up for');
    const written = sites.find((blocks) => blocks.includes('Bread worth getting up for'));
    expect(written).toBeDefined();
    expect(sites.at(-1)).not.toContain(UNWRITTEN_CLASS);
    const planned = reports.find(({ site }) => site !== null)?.site;
    expect(planned?.pages.ids).toHaveLength(3);
    expect(planned?.designSystem.iconSet).toBe('lucide');
    expect(reports.at(-1)?.site?.designSystem.iconSet).toBe('phosphor');
    expect(reports.at(-1)?.draft.look?.iconSet).toBe('phosphor');
  });

  it('says which page was written last, and none for the look, the plan or the navigation', async () => {
    const reports: BuildProgress[] = [];
    await buildSite(ask, emptyDraft('A bakery'), live(), (progress) => {
      reports.push(progress);
    });
    const changedPages = new Set<string | null>();
    for (const { draft, changedPage } of reports) {
      const writtenPages: string[] = [];
      for (const partId of Object.keys(draft.written)) {
        if (partId.startsWith('page:')) writtenPages.push(partId.split(':')[1]);
      }
      if (writtenPages.length === 0) {
        expect(changedPage).toBeNull();
      } else {
        expect(writtenPages).toContain(changedPage);
      }
      changedPages.add(changedPage);
    }
    expect(changedPages).toEqual(new Set([null, 'home', 'menu', 'visit']));
  });

  it('writes a long page in parts and never more than eight parts at once', async () => {
    const pages = ['Home', 'Menu', 'Visit', 'Team', 'Story'].map((name) => ({
      name,
      slug: name.toLowerCase(),
      purpose: name,
      sections: featureSections(11),
    }));
    handlers.site_plan = () => ({ ...PLAN, pages });
    handlers.Home = (request) => {
      const count = /exactly (?<count>\d+) entries/.exec(request.user)?.groups?.count;
      const sections = [];
      for (let index = 0; index < Number(count); index += 1) {
        sections.push({ values: { title: `Written ${request.user.length}` } });
      }
      return { sections };
    };
    let mostAtOnce = 0;
    const built = await buildSite(ask, emptyDraft('A bakery'), live(), ({ working }) => {
      const writing = working.filter((id) => !STEP_IDS.includes(id));
      mostAtOnce = Math.max(mostAtOnce, writing.length);
    });
    expect(asked.filter((step) => step.startsWith('Home'))).toEqual([
      'Home 1-4',
      'Home 5-8',
      'Home 9-11',
    ]);
    expect(asked.slice(2, 6)).toEqual(['Home 1-4', 'Home 5-8', 'Home 9-11', SHARED_ID]);
    expect(asked).toHaveLength(2 + 15 + 1);
    expect(mostAtOnce).toBe(PARTS_AT_ONCE);
    const home = built.project.pages.entities[built.project.pages.homePageId];
    expect(home?.blockIds).toHaveLength(11);
    expect(Object.keys(built.draft.written)).toHaveLength(16);
  });

  it('keeps default text for a page that could not be written', async () => {
    handlers.Menu = () => {
      throw new AssistantError('model', 'The model ran out of room.');
    };
    const built = await buildSite(ask, emptyDraft('A bakery'), live(), ignore);
    expect(built.defaultedPages).toEqual(['Menu']);
    expect(built.project.pages.ids).toHaveLength(3);
    expect(built.draft.written['page:menu:0']).toBeNull();
    expect(built.draft.written['page:home:0']).not.toBeNull();
    expect(JSON.stringify(built.project.blocks)).not.toContain(UNWRITTEN_CLASS);
  });

  it.each(['key', 'credit', 'network'] as const)(
    'stops on a %s error and can resume',
    async (kind) => {
      let latest: SiteDraft = emptyDraft('A bakery');
      handlers.site_plan = () => {
        throw new AssistantError(kind, 'Stopped.');
      };
      await expect(
        buildSite(ask, latest, live(), ({ draft }) => {
          latest = draft;
        }),
      ).rejects.toMatchObject({ kind });
      await vi.waitFor(() => expect(latest.look).not.toBeNull());
      expect(latest.plan).toBeNull();

      asked = [];
      handlers.site_plan = () => PLAN;
      const built = await buildSite(ask, latest, live(), ignore);
      expect(asked).not.toContain('design_brief');
      expect(asked[0]).toBe('site_plan');
      expect(built.project.pages.ids).toHaveLength(3);
    },
  );

  it('does not write finished parts again after a failure while writing', async () => {
    let latest: SiteDraft = emptyDraft('A bakery');
    handlers.Visit = () => {
      throw new AssistantError('network', 'Offline.');
    };
    await expect(
      buildSite(ask, latest, live(), ({ draft }) => {
        latest = draft;
      }),
    ).rejects.toMatchObject({ kind: 'network' });
    await vi.waitFor(() => expect(Object.keys(latest.written)).toHaveLength(3));
    expect(Object.keys(latest.written).sort()).toEqual(['page:home:0', 'page:menu:0', 'shared']);

    asked = [];
    handlers.Visit = () => ({ sections: [] });
    await buildSite(ask, latest, live(), ignore);
    expect(asked).toEqual(['Visit']);
  });

  it('fails when the plan has no usable page', async () => {
    handlers.site_plan = () => ({ pages: [] });
    await expect(buildSite(ask, emptyDraft('A bakery'), live(), ignore)).rejects.toMatchObject({
      kind: 'answer',
    });
  });

  it('stops when cancelled', async () => {
    const running = new AbortController();
    handlers.site_plan = () => {
      running.abort();
      return PLAN;
    };
    await expect(
      buildSite(ask, emptyDraft('A bakery'), running.signal, ignore),
    ).rejects.toMatchObject({ kind: 'cancelled' });
    expect(asked).not.toContain('Menu');
  });
});

describe('buildSite with images', () => {
  const HERO_PLAN = {
    ...PLAN,
    pages: [
      {
        name: 'Home',
        slug: 'home',
        purpose: 'Welcome',
        sections: [{ block: 'hero-image', custom: '', theme: 'default', note: '' }],
      },
    ],
  };
  const PICTURE = 'data:image/webp;base64,aGVsbG8=';
  const painter: Painter = {
    paint: async () => ({
      dataUrl: 'data:image/png;base64,AAAA',
      usage: { tokens: 50, cost: 0.04 },
    }),
    fit: async () => ({ src: PICTURE, width: 1200, height: 900 }),
  };

  beforeEach(() => {
    handlers.site_plan = () => HERO_PLAN;
    handlers.Home = () => ({
      sections: [
        { values: { image: { alt: 'A baker at the oven', subject: 'photo', ratio: '4:3' } } },
      ],
    });
  });

  it('creates the images after the text, shows each one and adds their cost', async () => {
    const labels: string[] = [];
    const shown: boolean[] = [];
    const built = await buildSite(
      ask,
      emptyDraft('A bakery'),
      live(),
      ({ draft, working, site, changedPage }) => {
        for (const step of buildSteps(draft, working)) {
          if (step.id === 'images') labels.push(`${step.label}: ${step.status}`);
        }
        const hasPicture = site !== null && JSON.stringify(site.blocks).includes(PICTURE);
        if (hasPicture) expect(changedPage).toBe('home');
        shown.push(hasPicture);
      },
      painter,
    );
    expect(labels[0]).toBe('Creating images: waiting');
    expect(labels).toContain('Creating images (0 of 1): working');
    expect(labels).toContain('Creating images (1 of 1): working');
    expect(labels.at(-1)).toBe('Creating images (1 of 1): done');
    expect(shown[0]).toBe(false);
    expect(shown.at(-1)).toBe(true);
    expect(built.failedImages).toBe(0);
    expect(built.draft.usage.tokens).toBe(100 * asked.length + 50);
    expect(JSON.stringify(built.project.blocks)).toContain(PICTURE);
    const saved: unknown = JSON.parse(JSON.stringify(built.project));
    expect(() => parseProjectDocument(saved)).not.toThrow();
  });

  it('still builds the site when an image fails and says how many', async () => {
    const failing: Painter = {
      ...painter,
      paint: async () => {
        throw new AssistantError('model', 'The model could not answer');
      },
    };
    const built = await buildSite(ask, emptyDraft('A bakery'), live(), ignore, failing);
    expect(built.failedImages).toBe(1);
    expect(JSON.stringify(built.project.blocks)).not.toContain('data:image/webp');
  });

  it('has no image step without a painter', async () => {
    const built = await buildSite(ask, emptyDraft('A bakery'), live(), ignore);
    expect(built.draft.images).toBeNull();
    expect(buildSteps(built.draft, []).map(({ id }) => id)).not.toContain('images');
  });
});

describe('buildStage', () => {
  it('follows the build from the look to putting it together', async () => {
    const start = emptyDraft('A bakery');
    expect(buildStage(start, ['design', 'plan'])).toBe('design');
    const { draft } = await buildSite(ask, start, live(), ignore);
    expect(buildStage({ ...draft, plan: null }, ['plan'])).toBe('plan');
    expect(buildStage(draft, ['page:menu:0'])).toBe('writing');
    expect(buildStage(draft, ['images'])).toBe('images');
    expect(buildStage(draft, ['assemble'])).toBe('assemble');
  });
});

describe('buildSteps', () => {
  it('lists the steps with their state as the draft fills in', async () => {
    const start = emptyDraft('A bakery');
    expect(buildSteps(start, ['design', 'plan'])).toEqual([
      { id: 'design', label: 'Designing the look', status: 'working' },
      { id: 'plan', label: 'Planning the pages', status: 'working' },
      { id: 'assemble', label: 'Putting it together', status: 'waiting' },
    ]);
    const { draft } = await buildSite(ask, start, live(), ignore);
    const partly: SiteDraft = {
      ...draft,
      written: { 'page:home:0': draft.written['page:home:0'] },
    };
    const rows = buildSteps(partly, ['page:menu:0']);
    expect(rows.map(({ label, status }) => `${label}: ${status}`)).toEqual([
      'Designing the look: done',
      'Planning the pages: done',
      'Writing the navigation and footer: waiting',
      'Writing Home: done',
      'Writing Menu: working',
      'Writing Visit: waiting',
      'Putting it together: waiting',
    ]);
  });

  it('shows one row for a page written in parts', async () => {
    const page = { name: 'Home', slug: 'home', purpose: 'Welcome', sections: featureSections(11) };
    handlers.site_plan = () => ({ ...PLAN, pages: [page] });
    const { draft } = await buildSite(ask, emptyDraft('A bakery'), live(), ignore);
    const first = { 'page:home:0': draft.written['page:home:0'] };
    function homeStatus(written: SiteDraft['written'], working: string[]): string | undefined {
      const rows = buildSteps({ ...draft, written }, working);
      return rows.find(({ label }) => label === 'Writing Home')?.status;
    }
    expect(buildSteps(draft, [])).toHaveLength(5);
    expect(homeStatus({}, [])).toBe('waiting');
    expect(homeStatus(first, ['page:home:4'])).toBe('working');
    expect(homeStatus(first, [])).toBe('waiting');
    expect(homeStatus(draft.written, [])).toBe('done');
  });
});
