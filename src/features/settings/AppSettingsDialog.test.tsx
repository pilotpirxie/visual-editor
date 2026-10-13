import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readAppSettings, updateAppSettings, type AssistantModel } from '../../app/appSettings';
import { changeValue, choiceInput, click, getButton, queryButton, render } from '../../test/dom';
import { AppSettingsDialog, type AppSettingsTab } from './AppSettingsDialog';

const WRITER: AssistantModel = {
  id: 'acme/writer',
  name: 'Acme Writer',
  canUseSchema: true,
  efforts: ['low', 'high'],
  contextLength: 200000,
  maxOutputTokens: 64000,
  promptPrice: 3,
  completionPrice: 15,
};

const MODELS_URL = 'https://openrouter.ai/api/v1/models';
const IMAGE_MODELS_URL = `${MODELS_URL}?output_modalities=image`;

const MODELS_REPLY = {
  data: [
    {
      id: 'acme/writer',
      name: 'Acme Writer',
      context_length: 200000,
      supported_parameters: ['structured_outputs'],
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
    },
  ],
};

let requests: string[] = [];
let sentKeys: (string | null)[] = [];
let signals: (AbortSignal | null)[] = [];
let reply: (url: string) => Response | Promise<Response> = () =>
  new Response(JSON.stringify(MODELS_REPLY));

function renderDialog(initialTab: AppSettingsTab = 'general'): HTMLDivElement {
  return render(<AppSettingsDialog initialTab={initialTab} onClose={() => {}} />).container;
}

function field(container: HTMLElement, id: string): HTMLInputElement | HTMLSelectElement {
  const element = container.querySelector(`#${id}`);
  const isField = element instanceof HTMLInputElement || element instanceof HTMLSelectElement;
  if (!isField) throw new Error(`No field with id ${id}`);
  return element;
}

function optionLabels(select: HTMLInputElement | HTMLSelectElement): string[] {
  const labels: string[] = [];
  for (const option of select.querySelectorAll('option')) labels.push(option.textContent ?? '');
  return labels;
}

async function tabOpened(): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

async function listsLoaded(container: HTMLElement): Promise<void> {
  await tabOpened();
  await vi.waitFor(() => {
    const isLoading = requests.length < 2 || container.textContent?.includes('Loading');
    if (isLoading) throw new Error('Still loading');
  });
}

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute('data-ve-appearance');
  requests = [];
  sentKeys = [];
  signals = [];
  reply = () => new Response(JSON.stringify(MODELS_REPLY));
  vi.stubGlobal('fetch', async (url: string, init: RequestInit = {}) => {
    requests.push(url);
    sentKeys.push(new Headers(init.headers).get('Authorization'));
    signals.push(init.signal ?? null);
    return reply(url);
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('AppSettingsDialog, General', () => {
  it('switches dark mode on and off', () => {
    const container = renderDialog();
    click(choiceInput(container, 'Dark mode'));
    expect(document.documentElement.getAttribute('data-ve-appearance')).toBe('dark');
    click(choiceInput(container, 'Dark mode'));
    expect(document.documentElement.getAttribute('data-ve-appearance')).toBeNull();
  });

  it('remembers the canvas size and the delete question at once', () => {
    const container = renderDialog();
    const device = field(container, 've-app-settings-device');
    expect(optionLabels(device)).toEqual([
      'Responsive',
      'Desktop (1440 px)',
      'Tablet (768 px)',
      'Phone (375 px)',
    ]);
    changeValue(device, 'tablet');
    click(choiceInput(container, 'Ask before deleting a block'));
    expect(readAppSettings()).toMatchObject({
      deviceOnOpen: 'tablet',
      shouldConfirmBlockDelete: true,
    });
    expect(requests).toEqual([]);
  });

  it('opens on the tab it is asked for and switches tabs', () => {
    const container = renderDialog('assistant');
    expect(container.textContent).toContain('OpenRouter API key');
    click(getButton(container, 'General'));
    expect(container.textContent).toContain('Canvas size when a project opens');
    expect(container.textContent).not.toContain('OpenRouter API key');
  });
});

describe('AppSettingsDialog, Assistant', () => {
  it('keeps the key hidden, saves it as typed and can remove it', () => {
    const container = renderDialog('assistant');
    const key = field(container, 've-app-settings-key');
    expect(key.getAttribute('type')).toBe('password');
    expect(getButton(container, 'Load models').disabled).toBe(true);
    changeValue(key, 'sk-or-test');
    expect(readAppSettings().openRouterKey).toBe('sk-or-test');
    click(getButton(container, 'Show'));
    expect(field(container, 've-app-settings-key').getAttribute('type')).toBe('text');
    click(getButton(container, 'Hide'));
    click(getButton(container, 'Remove'));
    expect(readAppSettings().openRouterKey).toBe('');
    expect(requests).toEqual([]);
  });

  it('loads both model lists when the tab opens, then lets a model be picked', async () => {
    updateAppSettings({ openRouterKey: 'sk-or-test' });
    const container = renderDialog('assistant');
    expect(container.textContent).toContain('No model chosen');
    await listsLoaded(container);
    expect([...requests].sort()).toEqual([MODELS_URL, IMAGE_MODELS_URL]);
    expect(container.textContent).toContain('2 models can build sites.');
    click(container.querySelector('.ve-model-option'));
    expect(readAppSettings().assistantModel).toEqual(WRITER);
    expect(container.querySelector('.ve-model-option')?.getAttribute('aria-pressed')).toBe('true');
    expect(container.textContent).toContain('$3.00 in, $15.00 out per million tokens');
    click(getButton(container, 'Reload models'));
    await vi.waitFor(() => {
      expect(requests).toHaveLength(3);
    });
    expect(requests[2]).toBe(MODELS_URL);
  });

  it('asks OpenRouter for nothing until the Assistant tab opens', async () => {
    updateAppSettings({ openRouterKey: 'sk-or-test' });
    const container = renderDialog('general');
    await tabOpened();
    expect(requests).toEqual([]);
    click(getButton(container, 'Assistant'));
    await listsLoaded(container);
    expect(requests).toHaveLength(2);
  });

  it('filters the model list by name', async () => {
    updateAppSettings({ openRouterKey: 'sk-or-test' });
    const container = renderDialog('assistant');
    await listsLoaded(container);
    changeValue(container.querySelector('input[type="search"]'), 'quick');
    const names = [...container.querySelectorAll('.ve-model-name')].map((name) => name.textContent);
    expect(names).toEqual(['Acme Quick']);
    changeValue(container.querySelector('input[type="search"]'), 'zzz');
    expect(container.textContent).toContain('No models match “zzz”.');
  });

  it('offers the efforts of the chosen model and forgets the effort on a new model', async () => {
    updateAppSettings({ openRouterKey: 'sk-or-test', assistantModel: WRITER });
    const container = renderDialog('assistant');
    const effort = field(container, 've-app-settings-effort');
    expect(optionLabels(effort)).toEqual(['Model default', 'Low', 'High']);
    changeValue(effort, 'high');
    expect(readAppSettings().assistantEffort).toBe('high');
    await listsLoaded(container);
    click(container.querySelectorAll('.ve-model-option')[1]);
    expect(readAppSettings().assistantModel?.id).toBe('acme/quick');
    expect(readAppSettings().assistantEffort).toBeNull();
    expect(field(container, 've-app-settings-effort').disabled).toBe(true);
    expect(container.textContent).toContain('This model has no effort setting.');
  });

  it('lets an image model be picked from its own list and removed again', async () => {
    updateAppSettings({ openRouterKey: 'sk-or-test' });
    reply = () =>
      new Response(
        JSON.stringify({
          data: [
            {
              id: 'acme/painter',
              name: 'Acme Painter',
              architecture: { output_modalities: ['image'] },
            },
            {
              id: 'acme/writer',
              name: 'Acme Writer',
              architecture: { output_modalities: ['text'] },
            },
          ],
        }),
      );
    const container = renderDialog('assistant');
    expect(container.textContent).toContain('No image model chosen');
    expect(getButton(container, 'Remove image model').disabled).toBe(true);
    await listsLoaded(container);
    expect(container.textContent).toContain('1 model can create images.');
    expect(container.querySelector('[aria-label="Image models"]')).not.toBeNull();
    click(container.querySelector('.ve-model-option'));
    expect(readAppSettings().imageModel).toEqual({ id: 'acme/painter', name: 'Acme Painter' });
    expect(readAppSettings().assistantModel).toBeNull();
    click(getButton(container, 'Remove image model'));
    expect(readAppSettings().imageModel).toBeNull();
    expect(container.textContent).toContain('No image model chosen');
  });

  it('says why the models did not load', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    updateAppSettings({ openRouterKey: 'wrong' });
    reply = () => new Response(JSON.stringify({ error: { code: 401 } }), { status: 401 });
    const container = renderDialog('assistant');
    await listsLoaded(container);
    expect(container.querySelector('[role="alert"]')?.textContent).toBe(
      'OpenRouter did not accept the API key. Check it in App settings.',
    );
    expect(container.querySelector('.ve-model-picker')).toBeNull();
  });

  it('says why the image models did not load and keeps the model list', async () => {
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {});
    updateAppSettings({ openRouterKey: 'sk-or-test' });
    reply = (url) => {
      if (url !== IMAGE_MODELS_URL) return new Response(JSON.stringify(MODELS_REPLY));
      return new Response(JSON.stringify({ error: { code: 402 } }), { status: 402 });
    };
    const container = renderDialog('assistant');
    await listsLoaded(container);
    expect(container.querySelector('[role="alert"]')).not.toBeNull();
    expect(logged.mock.calls[0][0]).toBe('The OpenRouter image model list did not load');
    expect(container.textContent).toContain('2 models can build sites.');
    expect(container.querySelector('[aria-label="Image models"]')).toBeNull();
    expect(queryButton(container, 'Load image models')).not.toBeNull();
  });

  it('sends the key without the spaces around it', async () => {
    updateAppSettings({ openRouterKey: '  sk-or-test ' });
    const container = renderDialog('assistant');
    await listsLoaded(container);
    expect(sentKeys).toEqual(['Bearer sk-or-test', 'Bearer sk-or-test']);
  });

  it('cannot reload a list while it is loading', async () => {
    updateAppSettings({ openRouterKey: 'sk-or-test' });
    reply = () => new Promise<Response>(() => {});
    const container = renderDialog('assistant');
    await tabOpened();
    expect(container.textContent).toContain('Loading models…');
    expect(getButton(container, 'Load models').disabled).toBe(true);
    expect(getButton(container, 'Load image models').disabled).toBe(true);
  });

  it('cancels a list that is still loading when the dialog goes away', async () => {
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {});
    updateAppSettings({ openRouterKey: 'sk-or-test' });
    reply = () => new Promise<Response>(() => {});
    const rendered = render(<AppSettingsDialog initialTab="assistant" onClose={() => {}} />);
    await tabOpened();
    expect(signals).toHaveLength(2);
    expect(signals.map((signal) => signal?.aborted)).toEqual([false, false]);
    rendered.unmount();
    expect(signals.map((signal) => signal?.aborted)).toEqual([true, true]);
    expect(logged).not.toHaveBeenCalled();
  });
});
