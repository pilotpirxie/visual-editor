import { beforeEach, describe, expect, it, vi } from 'vitest';
import { blockSelected, compactTabSelected } from '../../app/editorSlice';
import { dispatch, store } from '../../app/store';
import { registry } from '../../components/registry';
import { changeValue, click, firePointer, getButton, render, runInAct } from '../../test/dom';
import { componentBlockOf, homePage, loadIntoAppStore } from '../../test/fixtures';
import { dragController } from '../canvas/dragController';
import { BlocksTab, groupByCategory } from './BlocksTab';

vi.mock('../../persistence/db', () => ({
  putProject: vi.fn(async () => {}),
  getProject: vi.fn(async () => null),
  listProjects: vi.fn(async () => []),
  deleteProject: vi.fn(async () => {}),
}));

function componentIds(): string[] {
  const { project } = store.getState();
  const ids: string[] = [];
  for (const blockId of homePage(project).blockIds) {
    ids.push(componentBlockOf(project, blockId).componentId);
  }
  return ids;
}

function searchFor(container: HTMLElement, query: string): void {
  changeValue(container.querySelector('input[type="search"]'), query);
}

function categoryButton(container: HTMLElement, label: string): HTMLButtonElement {
  for (const button of container.querySelectorAll('.ve-categories button')) {
    if (button instanceof HTMLButtonElement && button.textContent?.startsWith(label)) return button;
  }
  throw new Error(`No category ${label}`);
}

beforeEach(() => {
  loadIntoAppStore();
});

describe('groupByCategory', () => {
  it('groups components in library order and leaves out empty categories', () => {
    const groups = groupByCategory([...registry.values()]);
    const ids: string[] = [];
    for (const group of groups) ids.push(group.id);
    expect(ids).toEqual([
      'navigations',
      'headers',
      'features',
      'how-it-works',
      'pricing',
      'testimonials',
      'logo-clouds',
      'numbers',
      'content',
      'faq',
      'contacts',
      'call-to-action',
      'footers',
    ]);
    const navigationIds = groups[0]?.components.map((component) => component.definition.id);
    expect(navigationIds).toEqual(['nav-centered', 'nav-cta', 'nav-simple']);
  });

  it('returns no groups for no components', () => {
    expect(groupByCategory([])).toEqual([]);
  });
});

describe('BlocksTab', () => {
  it('lists categories with how many blocks each has', () => {
    const { container } = render(<BlocksTab />);
    expect(categoryButton(container, 'Headers').textContent).toBe('Headers4');
  });

  it('opens a category and goes back to the list', () => {
    const { container } = render(<BlocksTab />);
    click(categoryButton(container, 'Content'));
    expect(container.querySelector('h2')?.textContent).toBe('Content');
    expect(container.querySelector('.ve-component-card')?.textContent).toBe(
      'Content, text and image',
    );
    click(getButton(container, 'All categories'));
    expect(container.querySelector('.ve-categories')).not.toBeNull();
  });

  it('searches by name and says when nothing matches', () => {
    const { container } = render(<BlocksTab />);
    searchFor(container, 'footer');
    expect(container.querySelectorAll('.ve-component-card')).toHaveLength(3);
    searchFor(container, 'carousel');
    expect(container.textContent).toContain('No blocks match “carousel”.');
  });

  it('inserts a clicked block after the selected one and shows it on the canvas', () => {
    runInAct(() => {
      dispatch(compactTabSelected('blocks'));
      dispatch(blockSelected(homePage(store.getState().project).blockIds[0]));
    });
    const { container } = render(<BlocksTab />);
    click(categoryButton(container, 'Call to action'));
    click(container.querySelector('.ve-component-card'));
    expect(componentIds()[1]).toBe('cta-banner');
    expect(store.getState().editor.compactView).toBe('canvas');
  });

  it('does not start a drag when a card is touched, so the list can scroll', () => {
    const { container } = render(<BlocksTab />);
    click(categoryButton(container, 'Content'));
    const card = container.querySelector('.ve-component-card');
    if (card === null) throw new Error('No component card');
    firePointer(card, 'pointerdown', { clientX: 10, clientY: 10, button: 0, pointerType: 'touch' });
    firePointer(window, 'pointermove', { clientX: 10, clientY: 200, buttons: 1 });
    expect(dragController.isActive()).toBe(false);
    firePointer(window, 'pointerup', { clientX: 10, clientY: 200, buttons: 0 });
  });

  it('starts a drag when a card is dragged with a mouse', () => {
    const { container } = render(<BlocksTab />);
    click(categoryButton(container, 'Content'));
    const card = container.querySelector('.ve-component-card');
    if (card === null) throw new Error('No component card');
    firePointer(card, 'pointerdown', { clientX: 10, clientY: 10, button: 0 });
    firePointer(window, 'pointermove', { clientX: 10, clientY: 200, buttons: 1 });
    expect(dragController.getSnapshot()?.payload).toEqual({
      kind: 'new',
      componentId: 'content-text-image',
      label: 'Content, text and image',
    });
    dragController.cancel();
  });
});
