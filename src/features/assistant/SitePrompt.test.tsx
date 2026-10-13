import { beforeEach, describe, expect, it, vi } from 'vitest';
import { updateAppSettings, type AssistantModel } from '../../app/appSettings';
import { changeValue, click, getButton, pressKey, render } from '../../test/dom';
import { SitePrompt } from './SitePrompt';

const MODEL: AssistantModel = {
  id: 'acme/writer',
  name: 'Acme Writer',
  canUseSchema: true,
  efforts: [],
  contextLength: null,
  maxOutputTokens: null,
  promptPrice: null,
  completionPrice: null,
};

function renderPrompt(isDisabled = false): {
  container: HTMLDivElement;
  onBuild: ReturnType<typeof vi.fn<(description: string) => void>>;
  onOpenSettings: ReturnType<typeof vi.fn<() => void>>;
} {
  const onBuild = vi.fn<(description: string) => void>();
  const onOpenSettings = vi.fn<() => void>();
  const { container } = render(
    <SitePrompt
      titleId="start"
      isDisabled={isDisabled}
      onBuild={onBuild}
      onOpenSettings={onOpenSettings}
    />,
  );
  return { container, onBuild, onOpenSettings };
}

beforeEach(() => {
  localStorage.clear();
});

describe('SitePrompt', () => {
  it('points to App settings until a key and a model are set', () => {
    const { container, onBuild, onOpenSettings } = renderPrompt();
    expect(container.querySelector('h1')?.textContent).toBe('Tell us about your site');
    expect(container.querySelector('textarea')?.getAttribute('aria-labelledby')).toBe('start');
    changeValue(container.querySelector('textarea'), 'A bakery site');
    expect(getButton(container, 'Build my site').disabled).toBe(true);
    click(getButton(container, 'Open App settings'));
    expect(onOpenSettings).toHaveBeenCalledOnce();
    expect(onBuild).not.toHaveBeenCalled();
  });

  it('still needs a model after the key is set', () => {
    updateAppSettings({ openRouterKey: 'sk-or-test' });
    const { container } = renderPrompt();
    changeValue(container.querySelector('textarea'), 'A bakery site');
    expect(getButton(container, 'Build my site').disabled).toBe(true);
  });

  it('builds from the trimmed description once it is ready', () => {
    updateAppSettings({ openRouterKey: 'sk-or-test', assistantModel: MODEL });
    const { container, onBuild } = renderPrompt();
    expect(container.textContent).not.toContain('OpenRouter');
    expect(container.textContent).not.toContain('Acme Writer');
    expect(getButton(container, 'Build my site').disabled).toBe(true);
    changeValue(container.querySelector('textarea'), '  A bakery site in Leeds  ');
    click(getButton(container, 'Build my site'));
    expect(onBuild).toHaveBeenCalledWith('A bakery site in Leeds');
  });

  it('builds on Enter and keeps Shift+Enter for a new line', () => {
    updateAppSettings({ openRouterKey: 'sk-or-test', assistantModel: MODEL });
    const { container, onBuild } = renderPrompt();
    const box = container.querySelector('textarea');
    changeValue(box, 'A bakery site');
    if (box === null) throw new Error('No description box');
    pressKey(box, 'Enter', { shiftKey: true });
    expect(onBuild).not.toHaveBeenCalled();
    pressKey(box, 'Enter');
    expect(onBuild).toHaveBeenCalledWith('A bakery site');
  });

  it('does not build an empty description on Enter', () => {
    updateAppSettings({ openRouterKey: 'sk-or-test', assistantModel: MODEL });
    const { container, onBuild } = renderPrompt();
    const box = container.querySelector('textarea');
    if (box === null) throw new Error('No description box');
    pressKey(box, 'Enter');
    expect(onBuild).not.toHaveBeenCalled();
  });

  it('waits while another site is being built', () => {
    updateAppSettings({ openRouterKey: 'sk-or-test', assistantModel: MODEL });
    const { container } = renderPrompt(true);
    changeValue(container.querySelector('textarea'), 'A bakery site');
    expect(getButton(container, 'Build my site').disabled).toBe(true);
  });
});
