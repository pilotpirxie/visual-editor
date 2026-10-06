import { beforeEach, describe, expect, it, vi } from 'vitest';
import { blockSelected, fieldFocusRequested } from '../../app/editorSlice';
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

function select(index: number): string {
  const blockId = blockIdAt(index);
  runInAct(() => dispatch(blockSelected(blockId)));
  return blockId;
}

function fieldInput(container: HTMLElement, path: string): HTMLElement | null {
  return container.querySelector(`[data-field-path="${path}"] :is(input, textarea, select)`);
}

beforeEach(() => {
  loadIntoAppStore();
});

describe('PropertiesPanel', () => {
  it('shows the design settings when no block is selected', () => {
    const { container } = render(<PropertiesPanel />);
    expect(container.querySelector('h2')?.textContent).toBe('Design');
  });

  it('shows the selected block name, category and grouped fields', () => {
    const { container } = render(<PropertiesPanel />);
    select(1);
    expect(container.querySelector('.ve-properties-title')?.textContent).toBe(
      'Hero, centered text',
    );
    expect(container.querySelector('header .ve-muted')?.textContent).toBe('Headers');
    expect(container.querySelectorAll('.ve-group-title').length).toBeGreaterThan(0);
  });

  it('hides fields that are switched off by another field', () => {
    const { container } = render(<PropertiesPanel />);
    select(1);
    expect(container.querySelector('[data-field-path="secondaryButton"]')).toBeNull();
  });

  it('saves typed text on the block and merges quick typing into one undo step', () => {
    const { container } = render(<PropertiesPanel />);
    const heroId = select(1);
    changeValue(fieldInput(container, 'title'), 'Ship');
    changeValue(fieldInput(container, 'title'), 'Ship it');
    expect(store.getState().project.blocks.entities[heroId].values.title).toBe('Ship it');
    expect(store.getState().history.past).toHaveLength(1);
  });

  it('records each pick in a dropdown as its own undo step', () => {
    const { container } = render(<PropertiesPanel />);
    select(2);
    changeValue(fieldInput(container, 'columns'), '2');
    changeValue(fieldInput(container, 'columns'), '4');
    expect(store.getState().history.past).toHaveLength(2);
  });

  it('records each segmented choice as its own undo step', () => {
    const { container } = render(<PropertiesPanel />);
    select(2);
    click(container.querySelector('[data-field-path="align"] input[value="left"]'));
    click(container.querySelector('[data-field-path="align"] input[value="center"]'));
    expect(store.getState().history.past).toHaveLength(2);
  });

  it('focuses the field clicked on the canvas and then forgets the request', () => {
    const { container } = render(<PropertiesPanel />);
    const heroId = blockIdAt(1);
    runInAct(() => dispatch(fieldFocusRequested({ blockId: heroId, path: 'title' })));
    expect(document.activeElement).toBe(fieldInput(container, 'title'));
    expect(store.getState().editor.focusRequest).toBeNull();
  });

  it('opens a list item to focus a field inside it', () => {
    const { container } = render(<PropertiesPanel />);
    const featuresId = blockIdAt(2);
    runInAct(() => dispatch(fieldFocusRequested({ blockId: featuresId, path: 'items.1' })));
    const item = container.querySelector('[data-field-path="items.1"]');
    expect(item?.querySelector('details')?.open).toBe(true);
    expect(item?.contains(document.activeElement)).toBe(true);
  });

  it('keeps a request it could not fulfil so it can retry later', () => {
    render(<PropertiesPanel />);
    const heroId = blockIdAt(1);
    runInAct(() => dispatch(fieldFocusRequested({ blockId: heroId, path: 'no-such-field' })));
    expect(store.getState().editor.focusRequest).toEqual({
      blockId: heroId,
      path: 'no-such-field',
    });
  });
});
