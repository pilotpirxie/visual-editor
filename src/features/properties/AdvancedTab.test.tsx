import { beforeEach, describe, expect, it, vi } from 'vitest';
import { blockSelected, propertiesTabChanged } from '../../app/editorSlice';
import { undo } from '../../app/history';
import { blockAdvancedSet } from '../../app/projectSlice';
import { dispatch, store } from '../../app/store';
import { changeValue, click, render, runInAct } from '../../test/dom';
import { homePage, loadIntoAppStore } from '../../test/fixtures';
import { PropertiesPanel } from './PropertiesPanel';

vi.mock('../../persistence/db', () => ({
  putProject: vi.fn(async () => {}),
  getProject: vi.fn(async () => null),
  listProjects: vi.fn(async () => []),
  deleteProject: vi.fn(async () => {}),
}));

function blockIdAt(index: number): string {
  return homePage(store.getState().project).blockIds[index];
}

function blockAt(index: number) {
  return store.getState().project.blocks.entities[blockIdAt(index)];
}

function openAdvanced(index: number): void {
  runInAct(() => {
    dispatch(blockSelected(blockIdAt(index)));
    dispatch(propertiesTabChanged('advanced'));
  });
}

function input(container: HTMLElement, id: string): HTMLInputElement {
  const element = container.querySelector(`#${id}`);
  if (!(element instanceof HTMLInputElement)) throw new Error(`No input #${id}`);
  return element;
}

beforeEach(() => {
  loadIntoAppStore();
});

describe('AdvancedTab', () => {
  it('sets an anchor id as the user types', () => {
    const { container } = render(<PropertiesPanel />);
    openAdvanced(1);
    changeValue(input(container, 've-advanced-anchor'), 'top');
    expect(blockAt(1).anchor).toBe('top');
  });

  it('explains an anchor id with the wrong format and keeps it as a draft', () => {
    const { container } = render(<PropertiesPanel />);
    openAdvanced(1);
    changeValue(input(container, 've-advanced-anchor'), 'Top');
    expect(blockAt(1).anchor).toBeUndefined();
    expect(container.querySelector('[role="alert"]')?.textContent).toBe(
      'Use lowercase letters, digits and hyphens, starting with a letter',
    );
  });

  it('refuses an anchor id another block on the page already uses', () => {
    const { container } = render(<PropertiesPanel />);
    runInAct(() =>
      dispatch(blockAdvancedSet(blockIdAt(2), { key: 'anchor', value: 'features' }, 'discrete')),
    );
    openAdvanced(1);
    changeValue(input(container, 've-advanced-anchor'), 'features');
    expect(blockAt(1).anchor).toBeUndefined();
    expect(container.querySelector('[role="alert"]')?.textContent).toBe(
      'Another block on this page already uses #features',
    );
  });

  it('stores extra classes while keeping the spaces the user is typing', () => {
    const { container } = render(<PropertiesPanel />);
    openAdvanced(1);
    const classes = input(container, 've-advanced-classes');
    changeValue(classes, 'promo ');
    expect(blockAt(1).extraClasses).toEqual(['promo']);
    expect(classes.value).toBe('promo ');
    changeValue(classes, 'promo wide');
    expect(blockAt(1).extraClasses).toEqual(['promo', 'wide']);
  });

  it('keeps invalid class names as a draft and shows stored classes again after undo', () => {
    const { container } = render(<PropertiesPanel />);
    openAdvanced(1);
    const classes = input(container, 've-advanced-classes');
    changeValue(classes, 'promo');
    changeValue(classes, 'promo 2col');
    expect(blockAt(1).extraClasses).toEqual(['promo']);
    expect(container.querySelector('[role="alert"]')).not.toBeNull();
    runInAct(() => dispatch(undo()));
    expect(classes.value).toBe('');
  });

  it('hides the block on the chosen devices', () => {
    const { container } = render(<PropertiesPanel />);
    openAdvanced(1);
    const boxes = [...container.querySelectorAll<HTMLInputElement>('.ve-hide-on input')];
    click(boxes[0]);
    click(boxes[2]);
    expect(blockAt(1).hideOn).toEqual(['phone', 'desktop']);
    click(boxes[0]);
    expect(blockAt(1).hideOn).toEqual(['desktop']);
  });
});
