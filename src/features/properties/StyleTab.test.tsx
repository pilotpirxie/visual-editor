import { beforeEach, describe, expect, it, vi } from 'vitest';
import { blockSelected, propertiesTabChanged } from '../../app/editorSlice';
import { undo } from '../../app/history';
import { dispatch, store } from '../../app/store';
import {
  changeValue,
  choiceInput,
  click,
  getButton,
  queryButton,
  render,
  runInAct,
} from '../../test/dom';
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

function themeInput(container: HTMLElement, label: string): HTMLInputElement | null {
  const themes = container.querySelector('fieldset.ui-segmented');
  if (themes === null) throw new Error('No section theme control');
  return choiceInput(themes, label);
}

beforeEach(() => {
  loadIntoAppStore();
});

describe('StyleTab', () => {
  it('shows a control for every token the block offers, set to its design value', () => {
    const { container } = render(<PropertiesPanel />);
    selectHeroStyle();
    const background = row(container, '--color-background');
    expect(background.textContent).toContain('Background');
    expect(choiceInput(background, 'Background')?.checked).toBe(true);
    const padding = row(container, '--section-padding-y').querySelector('select');
    expect(padding?.value).toBe('--section-padding-y');
    expect(padding?.selectedOptions[0]?.textContent).toMatch(/^Design value/);
    expect(container.querySelectorAll('.ve-override')).toHaveLength(3);
  });

  it('creates an override by choosing a value, with no extra step', () => {
    const { container } = render(<PropertiesPanel />);
    const heroId = selectHeroStyle();
    click(choiceInput(row(container, '--color-background'), 'Surface'));
    expect(overridesOf(heroId)).toEqual({ '--color-background': 'var(--color-surface)' });
  });

  it('offers Reset only for overridden tokens and resets with one click', () => {
    const { container } = render(<PropertiesPanel />);
    const heroId = selectHeroStyle();
    expect(queryButton(container, 'Reset Background to the design value')).toBeNull();
    click(choiceInput(row(container, '--color-background'), 'Surface'));
    click(getButton(container, 'Reset Background to the design value'));
    expect(overridesOf(heroId)).toEqual({});
    expect(queryButton(container, 'Reset Background to the design value')).toBeNull();
  });

  it('clears the override when the design value is chosen again', () => {
    const { container } = render(<PropertiesPanel />);
    const heroId = selectHeroStyle();
    const select = row(container, '--section-padding-y').querySelector('select');
    changeValue(select, '--space-8');
    expect(overridesOf(heroId)['--section-padding-y']).toBe('var(--space-8)');
    changeValue(select, '--section-padding-y');
    expect(overridesOf(heroId)).toEqual({});
    expect(queryButton(container, 'Reset Section padding to the design value')).toBeNull();
  });

  it('overrides padding with a spacing token or a custom value', () => {
    const { container } = render(<PropertiesPanel />);
    const heroId = selectHeroStyle();
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
    changeValue(row(container, '--section-padding-y').querySelector('select'), 'custom');
    const custom = row(container, '--section-padding-y').querySelector('input[type="text"]');
    expect(custom).toHaveProperty('value', 'clamp(3rem, 2rem + 4vw, 6rem)');
    changeValue(custom, '1rem; color: red');
    expect(overridesOf(heroId)['--section-padding-y']).toBe('clamp(3rem, 2rem + 4vw, 6rem)');
    expect(container.querySelector('[role="alert"]')?.textContent).toBe(
      'Use a CSS value such as 2rem or 24px',
    );
  });

  it('shows an override restored by undo', () => {
    const { container } = render(<PropertiesPanel />);
    const heroId = selectHeroStyle();
    click(choiceInput(row(container, '--color-text'), 'Primary'));
    click(getButton(container, 'Reset Text to the design value'));
    runInAct(() => dispatch(undo()));
    expect(overridesOf(heroId)).toEqual({ '--color-text': 'var(--color-primary)' });
    expect(choiceInput(row(container, '--color-text'), 'Primary')?.checked).toBe(true);
  });

  it('switches the section theme in one undo step and shows a custom mix as no theme', () => {
    const { container } = render(<PropertiesPanel />);
    const heroId = selectHeroStyle();
    function theme(label: string): HTMLInputElement | null {
      return themeInput(container, label);
    }
    click(choiceInput(row(container, '--color-text'), 'Primary'));
    click(theme('Dark'));
    expect(overridesOf(heroId)).toMatchObject({
      '--color-background': 'var(--theme-dark-background)',
      '--color-text': 'var(--theme-dark-text)',
      '--color-primary': 'var(--theme-dark-accent)',
    });
    expect(theme('Dark')?.checked).toBe(true);
    runInAct(() => dispatch(undo()));
    expect(overridesOf(heroId)).toEqual({ '--color-text': 'var(--color-primary)' });
    expect(container.querySelector('fieldset.ui-segmented input:checked')).toBeNull();
    click(theme('Default'));
    expect(overridesOf(heroId)).toEqual({});
    expect(theme('Default')?.checked).toBe(true);
  });

  it('keeps padding overrides when the theme changes', () => {
    const { container } = render(<PropertiesPanel />);
    const heroId = selectHeroStyle();
    changeValue(row(container, '--section-padding-y').querySelector('select'), '--space-8');
    click(themeInput(container, 'Surface'));
    expect(overridesOf(heroId)).toEqual({
      '--section-padding-y': 'var(--space-8)',
      '--color-background': 'var(--color-surface)',
    });
  });
});
