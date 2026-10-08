import { beforeEach, describe, expect, it, vi } from 'vitest';
import { designSheetToggled } from '../../app/editorSlice';
import { dispatch, store } from '../../app/store';
import { changeValue, click, getButton, pressKey, render, runInAct } from '../../test/dom';
import { loadIntoAppStore } from '../../test/fixtures';
import { DesignSystemSheet } from './DesignSystemSheet';

vi.mock('../../persistence/db', () => ({
  putProject: vi.fn(async () => {}),
  getProject: vi.fn(async () => null),
  listProjects: vi.fn(async () => []),
  deleteProject: vi.fn(async () => {}),
  listUserPresets: vi.fn(async () => []),
}));

function tokenValue(name: string): string | undefined {
  return store.getState().project.designSystem.tokens[name]?.value;
}

function input(container: HTMLElement, selector: string): HTMLElement | null {
  return container.querySelector(selector);
}

beforeEach(() => {
  loadIntoAppStore();
  runInAct(() => dispatch(designSheetToggled(true)));
});

describe('DesignSystemSheet', () => {
  it('changes a color token from its hex input', () => {
    const { container } = render(<DesignSystemSheet />);
    changeValue(input(container, '#ve-token---color-primary'), '#0f766e');
    expect(tokenValue('--color-primary')).toBe('#0f766e');
  });

  it('warns when text no longer contrasts with its background', () => {
    const { container } = render(<DesignSystemSheet />);
    expect(container.querySelector('.ve-design-warnings')).toBeNull();
    changeValue(input(container, '#ve-token---color-text'), '#cccccc');
    expect(container.querySelector('.ve-design-warnings')?.textContent).toContain(
      'Text on Background has a contrast of',
    );
  });

  it('regenerates the type scale from the base size and ratio', () => {
    const { container } = render(<DesignSystemSheet />);
    changeValue(input(container, '#ve-type-ratio'), '1.5');
    expect(tokenValue('--text-lg')).toBe('1.5rem');
    changeValue(input(container, '#ve-type-base'), '20');
    expect(tokenValue('--text-base')).toBe('1.25rem');
    expect(store.getState().project.designSystem.generators).toMatchObject({
      typeBasePx: 20,
      typeRatio: 1.5,
    });
  });

  it('regenerates the space steps from the base unit', () => {
    const { container } = render(<DesignSystemSheet />);
    changeValue(input(container, '#ve-space-unit'), '8');
    expect(tokenValue('--space-4')).toBe('2rem');
  });

  it('keeps an out-of-range base size as a draft with a message', () => {
    const { container } = render(<DesignSystemSheet />);
    changeValue(input(container, '#ve-space-unit'), '40');
    expect(tokenValue('--space-4')).toBe('1rem');
    expect(container.querySelector('[role="alert"]')?.textContent).toBe('Use 2 to 12 px');
  });

  it('changes a radius with its number input, keeping the unit', () => {
    const { container } = render(<DesignSystemSheet />);
    changeValue(input(container, '#ve-token---radius-md'), '0.75');
    expect(tokenValue('--radius-md')).toBe('0.75rem');
  });

  it('applies a shadow preset as one undo step', () => {
    const { container } = render(<DesignSystemSheet />);
    expect(container.querySelector('input[value="medium"]')).toHaveProperty('checked', true);
    click(container.querySelector('input[value="none"]'));
    expect(tokenValue('--shadow-lg')).toBe('none');
    expect(store.getState().history.past).toHaveLength(1);
  });

  it('points a component token at another design token', () => {
    const { container } = render(<DesignSystemSheet />);
    changeValue(input(container, '#ve-token---button-radius'), '--radius-full');
    expect(tokenValue('--button-radius')).toBe('var(--radius-full)');
  });

  it('closes from its close button and with Escape', () => {
    const { container } = render(<DesignSystemSheet />);
    pressKey(input(container, '#ve-token---radius-md') ?? container, 'Escape');
    expect(store.getState().editor.isDesignSheetOpen).toBe(false);
    runInAct(() => dispatch(designSheetToggled(true)));
    click(getButton(container, 'Close design'));
    expect(store.getState().editor.isDesignSheetOpen).toBe(false);
  });
});
