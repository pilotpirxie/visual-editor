import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { updateAppSettings, type AssistantModel } from '../../app/appSettings';
import { noticeDismissed } from '../../app/editorSlice';
import { navigate } from '../../app/router';
import { dispatch, store } from '../../app/store';
import type { Project } from '../../app/types';
import { putProject } from '../../persistence/db';
import { changeValue, click, getButton, pressKey, queryButton, render } from '../../test/dom';
import { GenerateSiteDialog } from './GenerateSiteDialog';

vi.mock('../../persistence/db', () => ({
  putProject: vi.fn(async () => {}),
}));

vi.mock('./siteImages', async (original) => ({
  ...(await original<typeof import('./siteImages')>()),
  fitImage: vi.fn(async () => ({
    src: 'data:image/webp;base64,aGVsbG8=',
    width: 1200,
    height: 900,
  })),
}));

vi.mock('../../app/router', async (original) => ({
  ...(await original<typeof import('../../app/router')>()),
  navigate: vi.fn(),
}));

const MODEL: AssistantModel = {
  id: 'acme/writer',
  name: 'Acme Writer',
  canUseSchema: true,
  efforts: ['high'],
  contextLength: null,
  maxOutputTokens: null,
  promptPrice: null,
  completionPrice: null,
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
  ],
};

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

const PAINTER = { id: 'acme/painter', name: 'Acme Painter' };
const IMAGE_QUESTION = 'Real images or placeholders?';
const SIZE_QUESTION = 'How big should the site be?';
const STANDARD_SIZE = 'Home plus a few pages (suggested)';
const REAL_IMAGES = 'Real images (suggested)';

const ORDERS = {
  question: 'Do you take orders online?',
  suggestions: ['Yes', 'By phone only'],
  allowsMany: false,
  recommended: [],
};
const PAGES = {
  question: 'Which pages do you want?',
  suggestions: ['Menu', 'Our story', 'Gallery'],
  allowsMany: true,
  recommended: ['Menu'],
};
const TONE = {
  question: 'What tone?',
  suggestions: ['Warm', 'Formal'],
  allowsMany: false,
  recommended: ['Warm'],
};
const CITY = { question: 'Which city?', suggestions: [], allowsMany: false, recommended: [] };
const CLEAR = { questions: [], brief: 'A Leeds bakery taking phone orders.' };

type Step = 'clarify' | 'design' | 'plan' | 'write';

let steps: Step[] = [];
let clarifications: unknown[] = [];
let failure: { step: Step; status: number } | null = null;
let userTexts: string[] = [];
let plan: unknown = PLAN;
let imageBodies: Record<string, unknown>[] = [];
let imageStatus = 200;

function stepOf(body: { response_format?: { json_schema?: { name?: string } } }): Step {
  const name = body.response_format?.json_schema?.name;
  if (name === 'site_clarification') return 'clarify';
  if (name === 'design_brief') return 'design';
  if (name === 'site_plan') return 'plan';
  return 'write';
}

function answerFor(step: Step): unknown {
  if (step === 'clarify') return clarifications.shift() ?? { questions: [], brief: 'A bakery.' };
  if (step === 'design') return {};
  if (step === 'plan') return plan;
  return { sections: [{ values: { title: 'Bread worth getting up for' } }] };
}

async function settle(): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

async function renderDialog(): Promise<{
  container: HTMLDivElement;
  onClose: ReturnType<typeof vi.fn<() => void>>;
  onOpenSettings: ReturnType<typeof vi.fn<() => void>>;
}> {
  const onClose = vi.fn<() => void>();
  const onOpenSettings = vi.fn<() => void>();
  const { container } = render(
    <GenerateSiteDialog
      description="A site for my bakery"
      onClose={onClose}
      onOpenSettings={onOpenSettings}
    />,
  );
  await settle();
  return { container, onClose, onOpenSettings };
}

function ownAnswer(container: HTMLElement): HTMLInputElement | null {
  return container.querySelector('.ve-questions-current input');
}

function currentQuestion(container: HTMLElement): HTMLElement {
  const question = container.querySelector<HTMLElement>('.ve-questions-question');
  if (question === null) throw new Error('No question is shown');
  return question;
}

function acceptSize(container: HTMLElement): void {
  expect(currentQuestion(container).textContent).toBe(SIZE_QUESTION);
  click(getButton(container, STANDARD_SIZE));
}

function planText(): string {
  return userTexts[steps.indexOf('plan')] ?? '';
}

function savedProjects(): Project[] {
  const projects: Project[] = [];
  for (const call of vi.mocked(putProject).mock.calls) projects.push(call[0]);
  return projects;
}

function noticeTexts(): string[] {
  return store.getState().editor.notices.map(({ text }) => text);
}

beforeEach(() => {
  localStorage.clear();
  updateAppSettings({
    openRouterKey: ' sk-or-test ',
    assistantModel: MODEL,
    assistantEffort: 'high',
  });
  for (const notice of store.getState().editor.notices) dispatch(noticeDismissed(notice.id));
  vi.mocked(putProject).mockClear();
  vi.mocked(navigate).mockClear();
  steps = [];
  clarifications = [];
  failure = null;
  userTexts = [];
  plan = PLAN;
  imageBodies = [];
  imageStatus = 200;
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.stubGlobal('fetch', async (url: string, init: RequestInit) => {
    const body = JSON.parse(String(init.body));
    if (url.endsWith('/images')) {
      imageBodies.push(body);
      expect(new Headers(init.headers).get('Authorization')).toBe('Bearer sk-or-test');
      const picture = { data: [{ b64_json: 'AAAA', media_type: 'image/png' }] };
      const answer = imageStatus === 200 ? picture : { error: { message: 'No image today' } };
      return new Response(JSON.stringify({ ...answer, usage: { total_tokens: 400, cost: 0.04 } }), {
        status: imageStatus,
      });
    }
    const step = stepOf(body);
    steps.push(step);
    userTexts.push(body.messages[1].content);
    expect(new Headers(init.headers).get('Authorization')).toBe('Bearer sk-or-test');
    expect(body.model).toBe('acme/writer');
    expect(body.reasoning).toEqual({ effort: 'high' });
    if (failure?.step === step) {
      return new Response(JSON.stringify({ error: { message: 'Nope' } }), {
        status: failure.status,
      });
    }
    return new Response(
      JSON.stringify({
        choices: [{ message: { content: JSON.stringify(answerFor(step)) } }],
        usage: { total_tokens: 1000, cost: 0.01 },
      }),
    );
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('GenerateSiteDialog', () => {
  it('asks only how big the site should be when the description is clear', async () => {
    const { container, onClose } = await renderDialog();
    expect(container.textContent).toContain('One quick question');
    expect(steps).toEqual(['clarify']);
    acceptSize(container);
    await vi.waitFor(() => expect(savedProjects()).toHaveLength(1));
    await settle();
    expect(steps).toEqual(['clarify', 'design', 'plan', 'write', 'write']);
    expect(planText()).toContain('Site size: "Home plus a few pages". Plan 3 to 4 pages.');
    const project = savedProjects()[0];
    expect(project.settings.title).toBe('Crumb & Co');
    expect(JSON.stringify(project.blocks)).toContain('Bread worth getting up for');
    expect(onClose).toHaveBeenCalledOnce();
    expect(navigate).toHaveBeenCalledWith(`/p/${project.id}/${project.pages.homePageId}`);
    expect(noticeTexts()).toEqual(['Your site is ready. It used 5,000 tokens ($0.05).']);
  });

  it('asks one question at a time, then builds from the answers', async () => {
    clarifications = [
      { questions: [ORDERS, PAGES, CITY], brief: 'A bakery, details open.' },
      CLEAR,
    ];
    const { container } = await renderDialog();
    expect(container.textContent).toContain('A few quick questions');
    expect(container.textContent).toContain('Question 1 of 4');
    expect(container.textContent).not.toContain('Used so far');
    expect(container.textContent).not.toContain(PAGES.question);
    expect(getButton(container, 'OK').disabled).toBe(true);

    click(getButton(container, 'By phone only'));
    expect(container.textContent).toContain('Question 2 of 4');
    expect(container.textContent).toContain('Choose as many as you like.');
    expect(document.activeElement?.textContent).toBe(PAGES.question);
    expect(getButton(container, 'Menu (suggested)').getAttribute('aria-pressed')).toBe('true');
    expect(getButton(container, 'Our story').getAttribute('aria-pressed')).toBe('false');

    click(getButton(container, 'Gallery'));
    click(getButton(container, 'Gallery'));
    click(getButton(container, 'Our story'));
    expect(container.textContent).toContain('Question 2 of 4');
    changeValue(ownAnswer(container), ' a blog ');
    click(getButton(container, 'OK'));

    expect(container.textContent).toContain('Question 3 of 4');
    expect(steps).toEqual(['clarify']);
    changeValue(ownAnswer(container), ' Leeds ');
    click(getButton(container, 'OK'));
    expect(container.textContent).toContain('Question 4 of 4');
    acceptSize(container);
    expect(container.textContent).toContain('Thinking about your answers…');
    await vi.waitFor(() => expect(savedProjects()).toHaveLength(1));
    expect(userTexts[1]).toContain('- Do you take orders online?\n  By phone only');
    expect(userTexts[1]).toContain('- Which pages do you want?\n  Menu, Our story, a blog');
    expect(userTexts[1]).toContain('- Which city?\n  Leeds');
    expect(userTexts[2]).toContain('"""A Leeds bakery taking phone orders."""');
    expect(noticeTexts()[0]).toContain('6,000 tokens');
  });

  it('accepts the suggested answers with Enter and picks answers by their letter', async () => {
    clarifications = [{ questions: [TONE, PAGES, ORDERS], brief: 'B' }, CLEAR];
    const { container } = await renderDialog();
    expect(getButton(container, 'Warm (suggested)').getAttribute('aria-pressed')).toBe('true');
    expect(getButton(container, 'OK').disabled).toBe(false);
    pressKey(currentQuestion(container), 'Enter');

    expect(container.textContent).toContain('Question 2 of 4');
    pressKey(currentQuestion(container), 'c');
    expect(getButton(container, 'Gallery').getAttribute('aria-pressed')).toBe('true');
    pressKey(getButton(container, 'Gallery'), 'Enter');

    expect(container.textContent).toContain('Question 3 of 4');
    pressKey(ownAnswer(container) ?? container, 'a');
    expect(container.textContent).toContain('Question 3 of 4');
    pressKey(currentQuestion(container), 'b');
    expect(currentQuestion(container).textContent).toBe(SIZE_QUESTION);
    pressKey(currentQuestion(container), 'Enter');
    await vi.waitFor(() => expect(savedProjects()).toHaveLength(1));
    expect(planText()).toContain('Site size: "Home plus a few pages"');
    expect(userTexts[1]).toContain('- What tone?\n  Warm');
    expect(userTexts[1]).toContain('- Which pages do you want?\n  Menu, Gallery');
    expect(userTexts[1]).toContain('- Do you take orders online?\n  By phone only');
  });

  it('goes back to an answer, replaces it by typing, and skips', async () => {
    clarifications = [{ questions: [ORDERS, TONE], brief: 'B' }, CLEAR];
    const { container } = await renderDialog();
    expect(queryButton(container, 'Back')).toBeNull();
    click(getButton(container, 'Yes'));
    click(getButton(container, 'Back'));
    expect(container.textContent).toContain('Question 1 of 3');
    expect(getButton(container, 'Yes').getAttribute('aria-pressed')).toBe('true');

    changeValue(ownAnswer(container), 'Only on Fridays');
    expect(getButton(container, 'Yes').getAttribute('aria-pressed')).toBe('false');
    click(getButton(container, 'OK'));

    expect(getButton(container, 'Warm (suggested)').getAttribute('aria-pressed')).toBe('true');
    click(getButton(container, 'Skip'));
    acceptSize(container);
    await vi.waitFor(() => expect(savedProjects()).toHaveLength(1));
    expect(userTexts[1]).toContain('- Do you take orders online?\n  Only on Fridays');
    expect(userTexts[1]).toContain('- What tone?\n  (no answer, decide yourself)');
  });

  it('stops asking after two rounds', async () => {
    clarifications = [{ questions: [CITY], brief: 'B' }, { questions: [TONE], brief: 'B' }, CLEAR];
    const { container } = await renderDialog();
    click(getButton(container, 'Skip'));
    acceptSize(container);
    await settle();
    expect(container.textContent).toContain('One quick question');
    expect(container.textContent).toContain('Question 1 of 1');
    expect(container.textContent).toContain(TONE.question);
    click(getButton(container, 'Skip'));
    await vi.waitFor(() => expect(savedProjects()).toHaveLength(1));
    expect(steps.filter((step) => step === 'clarify')).toHaveLength(3);
    expect(userTexts[2]).toContain('Do not ask anything now');
  });

  it('just builds without another call when nothing was confirmed', async () => {
    clarifications = [{ questions: [TONE, CITY], brief: 'A bakery somewhere.' }];
    const { container } = await renderDialog();
    click(getButton(container, 'Just build it'));
    await vi.waitFor(() => expect(savedProjects()).toHaveLength(1));
    expect(steps).toEqual(['clarify', 'design', 'plan', 'write', 'write']);
    expect(userTexts[1]).toContain('"""A bakery somewhere."""');
    expect(planText()).toContain('Site size: "Home plus a few pages"');
  });

  it('plans the size that was picked and the suggested one when the question is skipped', async () => {
    const first = await renderDialog();
    click(getButton(first.container, 'One page'));
    await vi.waitFor(() => expect(savedProjects()).toHaveLength(1));
    expect(planText()).toContain('Site size: "One page". Plan 1 page.');
    expect(userTexts.join('\n')).not.toContain(SIZE_QUESTION);

    steps = [];
    userTexts = [];
    const second = await renderDialog();
    click(getButton(second.container, 'Skip'));
    await vi.waitFor(() => expect(savedProjects()).toHaveLength(2));
    expect(planText()).toContain('Site size: "Home plus a few pages"');
  });

  it('just builds from the confirmed answers, without asking again', async () => {
    clarifications = [
      { questions: [ORDERS, TONE], brief: 'B' },
      { questions: [CITY], brief: 'C' },
    ];
    const { container } = await renderDialog();
    click(getButton(container, 'Yes'));
    click(getButton(container, 'Just build it'));
    await vi.waitFor(() => expect(savedProjects()).toHaveLength(1));
    expect(steps).toEqual(['clarify', 'clarify', 'design', 'plan', 'write', 'write']);
    expect(userTexts[1]).toContain('- Do you take orders online?\n  Yes');
    expect(userTexts[1]).not.toContain('What tone?');
    expect(userTexts[1]).toContain('Do not ask anything now');
    expect(userTexts[2]).toContain('"""C"""');
  });

  it('asks about images last when an image model is set, and creates them on Yes', async () => {
    updateAppSettings({ imageModel: PAINTER });
    plan = HERO_PLAN;
    clarifications = [{ questions: [CITY], brief: 'A bakery somewhere.' }, CLEAR];
    const { container } = await renderDialog();
    expect(container.textContent).toContain('Question 1 of 3');
    changeValue(ownAnswer(container), 'Leeds');
    click(getButton(container, 'OK'));
    acceptSize(container);
    expect(currentQuestion(container).textContent).toBe(IMAGE_QUESTION);
    const yes = getButton(container, REAL_IMAGES);
    expect(yes.getAttribute('aria-pressed')).toBe('true');
    click(yes);
    await vi.waitFor(() => expect(savedProjects()).toHaveLength(1));
    expect(steps).toEqual(['clarify', 'clarify', 'design', 'plan', 'write', 'write']);
    expect(userTexts[1]).toContain('- Which city?\n  Leeds');
    expect(userTexts[1]).not.toContain('Real images');
    expect(imageBodies).toHaveLength(1);
    expect(imageBodies[0]).toMatchObject({ model: 'acme/painter', aspect_ratio: '4:3', n: 1 });
    expect(imageBodies[0].prompt).toContain('A Leeds bakery taking phone orders.');
    expect(JSON.stringify(savedProjects()[0].blocks)).toContain('data:image/webp;base64,aGVsbG8=');
    expect(noticeTexts()).toEqual(['Your site is ready. It used 6,400 tokens ($0.10).']);
  });

  it('asks only about size and images when nothing else is unclear, then builds without another call', async () => {
    updateAppSettings({ imageModel: PAINTER });
    plan = HERO_PLAN;
    const { container } = await renderDialog();
    expect(container.textContent).toContain('Question 1 of 2');
    acceptSize(container);
    expect(currentQuestion(container).textContent).toBe(IMAGE_QUESTION);
    click(getButton(container, 'Placeholders'));
    await vi.waitFor(() => expect(savedProjects()).toHaveLength(1));
    expect(steps).toEqual(['clarify', 'design', 'plan', 'write', 'write']);
    expect(imageBodies).toEqual([]);
    expect(JSON.stringify(savedProjects()[0].blocks)).not.toContain('data:image/webp');
  });

  it('creates no images when the image question is skipped', async () => {
    updateAppSettings({ imageModel: PAINTER });
    plan = HERO_PLAN;
    const { container } = await renderDialog();
    acceptSize(container);
    click(getButton(container, 'Skip'));
    await vi.waitFor(() => expect(savedProjects()).toHaveLength(1));
    expect(imageBodies).toEqual([]);
  });

  it('creates no images after Just build it', async () => {
    updateAppSettings({ imageModel: PAINTER });
    plan = HERO_PLAN;
    const { container } = await renderDialog();
    click(getButton(container, 'Just build it'));
    await vi.waitFor(() => expect(savedProjects()).toHaveLength(1));
    expect(imageBodies).toEqual([]);
  });

  it('does not ask about images again in the second round', async () => {
    updateAppSettings({ imageModel: PAINTER });
    clarifications = [
      { questions: [CITY], brief: 'B' },
      { questions: [TONE], brief: 'C' },
    ];
    const { container } = await renderDialog();
    click(getButton(container, 'Skip'));
    acceptSize(container);
    click(getButton(container, REAL_IMAGES));
    await settle();
    expect(container.textContent).toContain('Question 1 of 1');
    expect(currentQuestion(container).textContent).toBe(TONE.question);
  });

  it('builds the site and says so when an image could not be created', async () => {
    updateAppSettings({ imageModel: PAINTER });
    plan = HERO_PLAN;
    imageStatus = 400;
    const { container } = await renderDialog();
    acceptSize(container);
    click(getButton(container, REAL_IMAGES));
    await vi.waitFor(() => expect(savedProjects()).toHaveLength(1));
    expect(imageBodies).toHaveLength(1);
    expect(noticeTexts()).toEqual([
      'Your site is ready. It used 5,000 tokens ($0.05).',
      '1 image could not be created, so it shows a placeholder.',
    ]);
  });

  it('types its status lines and keeps one steady text for screen readers', async () => {
    clarifications = [{ questions: [CITY], brief: 'B' }];
    vi.stubGlobal('fetch', () => new Promise(() => {}));
    const { container } = await renderDialog();
    expect(container.querySelector('[role="status"]')?.textContent).toBe(
      'Reading your description…',
    );
    expect(container.querySelector('.ve-typed')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('shows a refused key, offers App settings and saves nothing', async () => {
    failure = { step: 'clarify', status: 401 };
    const { container, onClose, onOpenSettings } = await renderDialog();
    expect(container.querySelector('[role="alert"]')?.textContent).toBe(
      'OpenRouter did not accept the API key. Check it in App settings.',
    );
    expect(savedProjects()).toEqual([]);
    click(getButton(container, 'Open App settings'));
    expect(onClose).toHaveBeenCalledOnce();
    expect(onOpenSettings).toHaveBeenCalledOnce();
  });

  it('resumes from the failed step on Try again', async () => {
    failure = { step: 'plan', status: 402 };
    const { container } = await renderDialog();
    acceptSize(container);
    await vi.waitFor(() => {
      expect(container.querySelector('[role="alert"]')?.textContent).toBe(
        'This OpenRouter key does not have enough credit for the request.',
      );
    });
    expect(container.textContent).toContain('Designing the look: done');
    expect(steps).toEqual(['clarify', 'design', 'plan']);
    failure = null;
    click(getButton(container, 'Try again'));
    await vi.waitFor(() => expect(savedProjects()).toHaveLength(1));
    expect(steps).toEqual(['clarify', 'design', 'plan', 'plan', 'write', 'write']);
    expect(queryButton(container, 'Open App settings')).toBeNull();
  });

  it('cancels the run and saves nothing', async () => {
    clarifications = [{ questions: [{ question: 'Which city?', suggestions: [] }], brief: 'B' }];
    const { container, onClose } = await renderDialog();
    click(getButton(container, 'Cancel'));
    await settle();
    expect(onClose).toHaveBeenCalledOnce();
    expect(savedProjects()).toEqual([]);
    expect(steps).toEqual(['clarify']);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('asks for a model when none is chosen', async () => {
    updateAppSettings({ assistantModel: null });
    const { container } = await renderDialog();
    expect(container.querySelector('[role="alert"]')?.textContent).toBe(
      'Pick a model in App settings first.',
    );
    expect(steps).toEqual([]);
    expect(queryButton(container, 'Open App settings')).not.toBeNull();
  });
});
