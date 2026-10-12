import { beforeEach, describe, expect, it, vi } from 'vitest';
import { parseProjectDocument } from '../../persistence/validateProject';
import {
  buildSite,
  buildStage,
  buildSteps,
  clarifySite,
  emptyDraft,
  SHARED_ID,
  type Ask,
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

function stepOf(request: StepRequest): string {
  if (request.schema !== null) return request.schema.name;
  const page = /^Write the content of the page "(?<name>[^"]+)"/.exec(request.user)?.groups?.name;
  return page ?? SHARED_ID;
}

let asked: string[] = [];
let handlers: Record<string, Handler> = {};

const ask: Ask = async (request, signal) => {
  const step = stepOf(request);
  asked.push(step);
  await Promise.resolve();
  if (signal.aborted) throw new AssistantError('cancelled', 'Cancelled.');
  const handler = handlers[step];
  const value = handler === undefined ? { sections: [] } : handler(request);
  const answer: JsonAnswer = { value, usage: USAGE };
  return answer;
};

function live(): AbortSignal {
  return new AbortController().signal;
}

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
    const result = await clarifySite(ask, 'A bakery site', [], true, live());
    expect(result.clarification).toEqual({
      isClear: false,
      questions: [
        { question: 'Where are you?', suggestions: [], allowsMany: false, recommended: [] },
      ],
      brief: 'A bakery site',
    });
    expect(result.usage).toEqual(USAGE);
  });

  it('asks nothing in the last round', async () => {
    handlers.site_clarification = (request) => {
      expect(request.user).toContain('Do not ask anything now');
      return { questions: [{ question: 'One more?' }], brief: 'Full brief' };
    };
    const result = await clarifySite(ask, 'A bakery site', [], false, live());
    expect(result.clarification).toEqual({ isClear: true, questions: [], brief: 'Full brief' });
  });
});

describe('buildSite', () => {
  it('designs, plans, writes every page and builds a valid project', async () => {
    const seen: string[][] = [];
    const built = await buildSite(
      ask,
      emptyDraft('A bakery in Leeds'),
      live(),
      (_draft, working) => {
        seen.push([...working]);
      },
    );
    expect(asked.slice(0, 2)).toEqual(['design_brief', 'site_plan']);
    expect([...asked.slice(2)].sort()).toEqual(['Home', 'Menu', 'Visit', SHARED_ID].sort());
    const saved: unknown = JSON.parse(JSON.stringify(built.project));
    expect(parseProjectDocument(saved)).toEqual(built.project);
    expect(built.project.settings.title).toBe('Crumb & Co');
    expect(built.project.designSystem.tokens['--color-primary'].value).toBe('#b4451f');
    expect(built.project.designSystem.fonts[0].family).toBe('Fraunces');
    expect(built.project.designSystem.iconSet).toBe('phosphor');
    expect(built.project.pages.ids).toHaveLength(3);
    expect(JSON.stringify(built.project.blocks)).toContain('Bread worth getting up for');
    expect(built.defaultedPages).toEqual([]);
    expect(built.draft.usage.tokens).toBe(600);
    expect(built.draft.usage.cost).toBeCloseTo(0.06);
    expect(seen[0]).toEqual(['design']);
    expect(seen.some((working) => working.length === 3)).toBe(true);
    expect(seen.every((working) => working.length <= 3)).toBe(true);
    expect(seen.at(-1)).toEqual(['assemble']);
  });

  it('keeps default text for a page that could not be written', async () => {
    handlers.Menu = () => {
      throw new AssistantError('model', 'The model ran out of room.');
    };
    const built = await buildSite(ask, emptyDraft('A bakery'), live(), () => {});
    expect(built.defaultedPages).toEqual(['Menu']);
    expect(built.project.pages.ids).toHaveLength(3);
    expect(built.draft.written.menu).toBeNull();
    expect(built.draft.written.home).not.toBeNull();
  });

  it.each(['key', 'credit', 'network'] as const)(
    'stops on a %s error and can resume',
    async (kind) => {
      let latest: SiteDraft = emptyDraft('A bakery');
      handlers.site_plan = () => {
        throw new AssistantError(kind, 'Stopped.');
      };
      await expect(
        buildSite(ask, latest, live(), (draft) => {
          latest = draft;
        }),
      ).rejects.toMatchObject({ kind });
      expect(latest.design).not.toBeNull();
      expect(latest.plan).toBeNull();

      asked = [];
      handlers.site_plan = () => PLAN;
      const built = await buildSite(ask, latest, live(), () => {});
      expect(asked).not.toContain('design_brief');
      expect(asked[0]).toBe('site_plan');
      expect(built.project.pages.ids).toHaveLength(3);
    },
  );

  it('does not write finished pages again after a failure while writing', async () => {
    let latest: SiteDraft = emptyDraft('A bakery');
    handlers.Visit = () => {
      throw new AssistantError('network', 'Offline.');
    };
    await expect(
      buildSite(ask, latest, live(), (draft) => {
        latest = draft;
      }),
    ).rejects.toMatchObject({ kind: 'network' });
    await Promise.resolve();
    await Promise.resolve();
    const written = Object.keys(latest.written);
    expect(written).not.toContain('visit');

    asked = [];
    handlers.Visit = () => ({ sections: [] });
    await buildSite(ask, latest, live(), () => {});
    expect(asked).toContain('Visit');
    for (const done of written) {
      const name =
        done === SHARED_ID ? SHARED_ID : `${done.charAt(0).toUpperCase()}${done.slice(1)}`;
      expect(asked).not.toContain(name);
    }
  });

  it('fails when the plan has no usable page', async () => {
    handlers.site_plan = () => ({ pages: [] });
    await expect(buildSite(ask, emptyDraft('A bakery'), live(), () => {})).rejects.toMatchObject({
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
      buildSite(ask, emptyDraft('A bakery'), running.signal, () => {}),
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
  const painter: Painter = {
    paint: async () => ({
      dataUrl: 'data:image/png;base64,AAAA',
      usage: { tokens: 50, cost: 0.04 },
    }),
    fit: async () => ({ src: 'data:image/webp;base64,aGVsbG8=', width: 1200, height: 900 }),
  };

  beforeEach(() => {
    handlers.site_plan = () => HERO_PLAN;
    handlers.Home = () => ({
      sections: [
        { values: { image: { alt: 'A baker at the oven', subject: 'photo', ratio: '4:3' } } },
      ],
    });
  });

  it('creates the images after the text and adds their cost', async () => {
    const labels: string[] = [];
    const built = await buildSite(
      ask,
      emptyDraft('A bakery'),
      live(),
      (draft, working) => {
        for (const step of buildSteps(draft, working)) {
          if (step.id === 'images') labels.push(`${step.label}: ${step.status}`);
        }
      },
      painter,
    );
    expect(labels[0]).toBe('Creating images: waiting');
    expect(labels).toContain('Creating images (0 of 1): working');
    expect(labels.at(-1)).toBe('Creating images (1 of 1): done');
    expect(built.failedImages).toBe(0);
    expect(built.draft.usage.tokens).toBe(100 * asked.length + 50);
    expect(JSON.stringify(built.project.blocks)).toContain('data:image/webp;base64,aGVsbG8=');
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
    const built = await buildSite(ask, emptyDraft('A bakery'), live(), () => {}, failing);
    expect(built.failedImages).toBe(1);
    expect(JSON.stringify(built.project.blocks)).not.toContain('data:image/webp');
  });

  it('has no image step without a painter', async () => {
    const built = await buildSite(ask, emptyDraft('A bakery'), live(), () => {});
    expect(built.draft.images).toBeNull();
    expect(buildSteps(built.draft, []).map(({ id }) => id)).not.toContain('images');
  });
});

describe('buildStage', () => {
  it('follows the build from the look to putting it together', async () => {
    const start = emptyDraft('A bakery');
    expect(buildStage(start, ['design'])).toBe('design');
    const { draft } = await buildSite(ask, start, live(), () => {});
    expect(buildStage({ ...draft, plan: null }, ['plan'])).toBe('plan');
    expect(buildStage(draft, ['menu'])).toBe('writing');
    expect(buildStage(draft, ['images'])).toBe('images');
    expect(buildStage(draft, ['assemble'])).toBe('assemble');
  });
});

describe('buildSteps', () => {
  it('lists the steps with their state as the draft fills in', async () => {
    const start = emptyDraft('A bakery');
    expect(buildSteps(start, ['design'])).toEqual([
      { id: 'design', label: 'Designing the look', status: 'working' },
      { id: 'plan', label: 'Planning the pages', status: 'waiting' },
      { id: 'assemble', label: 'Putting it together', status: 'waiting' },
    ]);
    const { draft } = await buildSite(ask, start, live(), () => {});
    const partly: SiteDraft = { ...draft, written: { home: draft.written.home } };
    expect(buildSteps(partly, ['menu']).map(({ label, status }) => `${label}: ${status}`)).toEqual([
      'Designing the look: done',
      'Planning the pages: done',
      'Writing the navigation and footer: waiting',
      'Writing Home: done',
      'Writing Menu: working',
      'Writing Visit: waiting',
      'Putting it together: waiting',
    ]);
  });
});
