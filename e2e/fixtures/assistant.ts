import type { Page, Route } from '@playwright/test';

export type OpenRouterStub = { steps: string[] };

export type OpenRouterOptions = {
  hasQuestions?: boolean;
  hasImagePage?: boolean;
  failingStatus?: number;
};

export const IMAGE_MODEL = { id: 'acme/painter', name: 'Acme Painter' };

export const ASSISTANT_SETTINGS = {
  openRouterKey: 'sk-or-test',
  assistantModel: {
    id: 'acme/writer',
    name: 'Acme Writer',
    canUseSchema: true,
    efforts: ['low', 'high'],
    contextLength: 200000,
    maxOutputTokens: 64000,
    promptPrice: 3,
    completionPrice: 15,
  },
  assistantEffort: null,
};

const CORS_HEADERS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': '*',
  'access-control-allow-methods': 'GET, POST, OPTIONS',
};

const MODELS = {
  data: [
    {
      id: 'acme/writer',
      name: 'Acme Writer',
      context_length: 200000,
      supported_parameters: ['structured_outputs', 'reasoning'],
      architecture: { output_modalities: ['text'] },
      pricing: { prompt: '0.000003', completion: '0.000015' },
      top_provider: { max_completion_tokens: 64000 },
      reasoning: { supported_efforts: ['low', 'high'] },
    },
    {
      id: 'acme/quick',
      name: 'Acme Quick',
      supported_parameters: ['response_format'],
      architecture: { output_modalities: ['text'] },
      pricing: { prompt: '0.0000001', completion: '0.0000004' },
    },
    {
      id: 'acme/painter',
      name: 'Acme Painter',
      supported_parameters: ['response_format'],
      architecture: { output_modalities: ['image'] },
    },
  ],
};

const PICTURE_PNG =
  'iVBORw0KGgoAAAANSUhEUgAAAGAAAABACAIAAABqVuVZAAAAaUlEQVR42u3QMQ0AAAgDsMlBEzoRiANujiZV0EwXhygQJEiQIEGCBAlCkCBBggQJEiQIQYIECRIkSJAgBAkSJEiQIEGCBCFIkCBBggQJEoQgQYIECRIkSBCCBAkSJEiQIEGCECRIkKB/FvDUEbQg70FtAAAAAElFTkSuQmCC';

const QUESTIONS = {
  isClear: false,
  questions: [
    {
      question: 'Do you take orders online?',
      suggestions: ['Yes', 'By phone only'],
      allowsMany: false,
      recommended: [],
    },
    {
      question: 'Which pages do you want?',
      suggestions: ['Menu', 'Our story', 'Gallery'],
      allowsMany: true,
      recommended: ['Menu'],
    },
    { question: 'Which city are you in?', suggestions: [], allowsMany: false, recommended: [] },
  ],
  brief: 'A bakery site. Ordering and location are open.',
};

const CLEAR = { isClear: true, questions: [], brief: 'Crumb & Co, a bakery in Leeds.' };

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
  description: 'A neighbourhood bakery in Leeds.',
  language: 'en',
  header: 'nav-simple',
  footer: 'footer-simple',
  pages: [
    {
      name: 'Home',
      slug: 'home',
      purpose: 'Introduce the bakery',
      sections: [
        { block: 'hero-centered', custom: '', theme: 'default', note: 'Fresh bread' },
        { block: 'features-grid-3', custom: '', theme: 'surface', note: 'Why us' },
        { block: '', custom: 'A table of opening hours', theme: 'default', note: '' },
        { block: 'cta-centered', custom: '', theme: 'dark', note: 'Order a cake' },
      ],
    },
    {
      name: 'Menu',
      slug: 'menu',
      purpose: 'What we bake',
      sections: [{ block: 'pricing-3-plans', custom: '', theme: 'default', note: 'Prices' }],
    },
  ],
};

const IMAGE_PLAN = {
  ...PLAN,
  pages: [
    PLAN.pages[0],
    {
      ...PLAN.pages[1],
      sections: [
        ...PLAN.pages[1].sections,
        { block: 'cta-image', custom: '', theme: 'default', note: 'Order a cake' },
      ],
    },
  ],
};

const HOURS_HTML =
  '<section class="section"><div class="container stack"><h2>Opening hours</h2>' +
  '<script>window.stolen = true</script><img src="https://example.com/x.png" alt="">' +
  '<table><tr><td>Monday to Saturday</td><td>7 to 4</td></tr></table></div></section>';

const HOME = {
  sections: [
    {
      values: {
        title: 'Bread worth getting up for',
        primaryButton: { label: 'See the menu', link: { type: 'page', pageId: 'menu' } },
      },
    },
    { values: { title: 'Why people queue' } },
    { html: HOURS_HTML },
    { values: { title: 'Order a cake for Saturday' } },
  ],
};

const SHARED = {
  sections: [
    {
      values: {
        links: [
          { label: 'Our menu', link: { type: 'page', pageId: 'menu' } },
          { label: 'Home', link: { type: 'page', pageId: 'home' } },
        ],
      },
    },
    { values: {} },
  ],
};

type ChatBody = {
  messages: { content: string }[];
  response_format?: { json_schema?: { name?: string } };
};

function stepOf(body: ChatBody): string {
  const name = body.response_format?.json_schema?.name;
  if (name !== undefined) return name;
  const user = body.messages[1]?.content ?? '';
  const page = /^Write the content of the page "(?<name>[^"]+)"/.exec(user)?.groups?.name;
  return page ?? 'shared';
}

function answerFor(step: string, clarifyCount: number, options: OpenRouterOptions): unknown {
  if (step === 'site_clarification') {
    return options.hasQuestions === true && clarifyCount === 1 ? QUESTIONS : CLEAR;
  }
  if (step === 'design_brief') return DESIGN;
  if (step === 'site_plan') return options.hasImagePage === true ? IMAGE_PLAN : PLAN;
  if (step === 'Home') return HOME;
  if (step === 'shared') return SHARED;
  return { sections: [] };
}

export async function stubOpenRouter(
  page: Page,
  options: OpenRouterOptions = {},
): Promise<OpenRouterStub> {
  const stub: OpenRouterStub = { steps: [] };
  let clarifyCount = 0;

  async function answer(route: Route): Promise<void> {
    const request = route.request();
    if (request.method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: CORS_HEADERS });
      return;
    }
    if (request.url().endsWith('/models')) {
      stub.steps.push('models');
      await route.fulfill({ json: MODELS, headers: CORS_HEADERS });
      return;
    }
    if (request.url().endsWith('/models?output_modalities=image')) {
      stub.steps.push('image-models');
      await route.fulfill({ json: { data: [MODELS.data[2]] }, headers: CORS_HEADERS });
      return;
    }
    if (request.url().endsWith('/images')) {
      stub.steps.push('image');
      await route.fulfill({
        json: {
          data: [{ b64_json: PICTURE_PNG, media_type: 'image/png' }],
          usage: { total_tokens: 4000, cost: 0.04 },
        },
        headers: CORS_HEADERS,
      });
      return;
    }
    const body: ChatBody = request.postDataJSON();
    const step = stepOf(body);
    stub.steps.push(step);
    if (options.failingStatus !== undefined) {
      await route.fulfill({
        status: options.failingStatus,
        json: { error: { code: options.failingStatus, message: 'Refused' } },
        headers: CORS_HEADERS,
      });
      return;
    }
    if (step === 'site_clarification') clarifyCount += 1;
    const content = JSON.stringify(answerFor(step, clarifyCount, options));
    await route.fulfill({
      json: { choices: [{ message: { content } }], usage: { total_tokens: 1500, cost: 0.012 } },
      headers: CORS_HEADERS,
    });
  }

  await page.route('https://openrouter.ai/**', answer);
  return stub;
}

export async function useAssistantSettings(page: Page, hasImageModel = false): Promise<void> {
  const imageModel = hasImageModel ? IMAGE_MODEL : null;
  await page.addInitScript(
    (settings) => {
      localStorage.setItem('ve-settings', JSON.stringify(settings));
    },
    { ...ASSISTANT_SETTINGS, imageModel },
  );
}
