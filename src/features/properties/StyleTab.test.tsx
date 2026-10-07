import { beforeEach, describe, expect, it, vi } from 'vitest';
import { blockSelected, propertiesTabChanged } from '../../app/editorSlice';
import { undo } from '../../app/history';
import { dispatch, store } from '../../app/store';
import { changeValue, click, getButton, render, runInAct } from '../../test/dom';
import { componentBlockOf, homePage, loadIntoAppStore } from '../../test/fixtures';
import { PropertiesPanel } from './PropertiesPanel';

vi.mock('../../persistence/db', () => ({
  putProject: vi.fn(async () => {}),
  getProject: vi.fn(async () => null),
  listProjects: vi.fn(async () => []),
  deleteProject: vi.fn(async () => {}),
}));

function selectHeroStyle(): string {
  const heroId = homePage(store.getState().project).blockIds[1];
  runInAct(() => {
    dispatch(blockSelected(heroId));
    dispatch(propertiesTabChanged('style'));
  });
  return heroId;
}

function overridesOf(blockId: string): Record<string, string> {
  return componentBlockOf(store.getState().project, blockId).overrides;
}

function row(container: HTMLElement, token: string): HTMLElement {
  const element = container.querySelector<HTMLElement>(`.ve-override[data-token="${token}"]`);
  if (element === null) throw new Error(`No style row for ${token}`);
  return element;
}

beforeEach(() => {
  loadIntoAppStore();
});

describe('StyleTab', () => {
  it('lists the tokens the block offers with their inherited design values', () => {
    const { container } = render(<PropertiesPanel />);
    selectHeroStyle();
    const background = row(container, '--color-background');
    expect(background.textContent).toContain('Background');
    expect(background.querySelector('.ve-override-inherited')?.textContent).toBe('#ffffff');
    expect(container.querySelectorAll('.ve-override')).toHaveLength(3);
  });

  it('overrides a color with a design swatch and resets it with one click', () => {
    const { container } = render(<PropertiesPanel />);
    const heroId = selectHeroStyle();
    click(getButton(row(container, '--color-background'), 'Override'));
    const surface = row(container, '--color-background').querySelector('[title="Surface"] input');
    click(surface);
    expect(overridesOf(heroId)).toEqual({ '--color-background': 'var(--color-surface)' });
    click(getButton(container, 'Reset Background to the design value'));
    expect(overridesOf(heroId)).toEqual({});
    expect(getButton(row(container, '--color-background'), 'Override')).toBeDefined();
  });

  it('overrides padding with a spacing token or a custom value', () => {
    const { container } = render(<PropertiesPanel />);
    const heroId = selectHeroStyle();
    click(getButton(row(container, '--section-padding-y'), 'Override'));
    const select = row(container, '--section-padding-y').querySelector('select');
    changeValue(select, '--space-8');
    expect(overridesOf(heroId)['--section-padding-y']).toBe('var(--space-8)');
    changeValue(select, 'custom');
    expect(overridesOf(heroId)['--section-padding-y']).toBe('2rem');
    const custom = row(container, '--section-padding-y').querySelector('input[type="text"]');
    changeValue(custom, '5rem');
    expect(overridesOf(heroId)['--section-padding-y']).toBe('5rem');
  });

  it('keeps an unsafe custom value as a draft with a message instead of saving it', () => {
    const { container } = render(<PropertiesPanel />);
    const heroId = selectHeroStyle();
    click(getButton(row(container, '--section-padding-y'), 'Override'));
    const custom = row(container, '--section-padding-y').querySelector('input[type="text"]');
    expect(custom).toHaveProperty('value', 'clamp(3rem, 2rem + 4vw, 6rem)');
    changeValue(custom, '1rem; color: red');
    expect(overridesOf(heroId)['--section-padding-y']).toBeUndefined();
    expect(container.querySelector('[role="alert"]')?.textContent).toBe(
      'Use a CSS value such as 2rem or 24px',
    );
  });

  it('shows an override restored by undo', () => {
    const { container } = render(<PropertiesPanel />);
    const heroId = selectHeroStyle();
    click(getButton(row(container, '--color-text'), 'Override'));
    click(row(container, '--color-text').querySelector('[title="Primary"] input'));
    click(getButton(container, 'Reset Text to the design value'));
    runInAct(() => dispatch(undo()));
    expect(overridesOf(heroId)).toEqual({ '--color-text': 'var(--color-primary)' });
    expect(
      row(container, '--color-text').querySelector('[title="Primary"] input:checked'),
    ).not.toBeNull();
  });
});
