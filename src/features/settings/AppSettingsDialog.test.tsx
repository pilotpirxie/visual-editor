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
let reply: () => Response = () => new Response(JSON.stringify(MODELS_REPLY));

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

async function loadModels(container: HTMLElement): Promise<void> {
  click(getButton(container, 'Load models'));
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
  await vi.waitFor(() => {
    if (container.textContent?.includes('Loading models')) throw new Error('Still loading');
  });
}

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute('data-ve-appearance');
  requests = [];
  reply = () => new Response(JSON.stringify(MODELS_REPLY));
  vi.stubGlobal('fetch', async (url: string) => {
    requests.push(url);
    return reply();
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

  it('loads the models only when asked, then lets one be picked', async () => {
    updateAppSettings({ openRouterKey: 'sk-or-test' });
    const container = renderDialog('assistant');
    expect(requests).toEqual([]);
    expect(container.textContent).toContain('No model chosen');
    await loadModels(container);
    expect(requests).toEqual(['https://openrouter.ai/api/v1/models']);
    expect(container.textContent).toContain('2 models can build sites.');
    click(container.querySelector('.ve-model-option'));
    expect(readAppSettings().assistantModel).toEqual(WRITER);
    expect(container.querySelector('.ve-model-option')?.getAttribute('aria-pressed')).toBe('true');
    expect(container.textContent).toContain('$3.00 in, $15.00 out per million tokens');
    expect(queryButton(container, 'Reload models')).not.toBeNull();
  });

  it('filters the model list by name', async () => {
    updateAppSettings({ openRouterKey: 'sk-or-test' });
    const container = renderDialog('assistant');
    await loadModels(container);
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
    await loadModels(container);
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
    click(getButton(container, 'Load image models'));
    await vi.waitFor(() => {
      expect(container.textContent).toContain('1 model can create images.');
    });
    expect(requests).toEqual(['https://openrouter.ai/api/v1/models?output_modalities=image']);
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
    await loadModels(container);
    expect(container.querySelector('[role="alert"]')?.textContent).toBe(
      'OpenRouter did not accept the API key. Check it in App settings.',
    );
    expect(container.querySelector('.ve-model-picker')).toBeNull();
  });
});
