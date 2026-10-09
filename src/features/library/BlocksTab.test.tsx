import { beforeEach, describe, expect, it, vi } from 'vitest';
import { blockPacksLoaded, blockSelected, compactTabSelected } from '../../app/editorSlice';
import { dispatch, store } from '../../app/store';
import { builtInComponents } from '../../components/registry';
import { CATEGORIES } from '../../components/types';
import { changeValue, click, firePointer, getButton, render, runInAct } from '../../test/dom';
import { componentBlockOf, homePage, loadIntoAppStore } from '../../test/fixtures';
import { packOf, quoteCardDefinition } from '../../test/packFixtures';
import { dragController } from '../canvas/dragController';
import { BlocksTab, groupByCategory } from './BlocksTab';

vi.mock('../../persistence/db', () => ({
  putProject: vi.fn(async () => {}),
  listBlockPacks: vi.fn(async () => []),
  getProject: vi.fn(async () => null),
  listProjects: vi.fn(async () => []),
  deleteProject: vi.fn(async () => {}),
}));

const ENTRIES = [...builtInComponents.values()];

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
  it('groups components in library order and fills every category', () => {
    const groups = groupByCategory(ENTRIES);
    const ids: string[] = [];
    for (const group of groups) ids.push(group.id);
    expect(ids).toEqual(CATEGORIES.map(({ id }) => id));
    const navigationIds = groups[0]?.components.map((component) => component.definition.id);
    expect(navigationIds).toEqual([
      'nav-app',
      'nav-centered',
      'nav-contact',
      'nav-cta',
      'nav-docs',
      'nav-drawer',
      'nav-dropdown',
      'nav-edge-cta',
      'nav-editorial',
      'nav-event',
      'nav-language',
      'nav-logo-image',
      'nav-mega',
      'nav-minimal',
      'nav-overlay',
      'nav-pill',
      'nav-search',
      'nav-shop',
      'nav-simple',
      'nav-social',
      'nav-split',
      'nav-sticky',
      'nav-subnav',
      'nav-topbar',
    ]);
  });

  it('leaves out empty categories', () => {
    const navigations = ENTRIES.filter(({ definition }) => definition.category === 'navigations');
    expect(groupByCategory(navigations).map(({ id }) => id)).toEqual(['navigations']);
  });

  it('returns no groups for no components', () => {
    expect(groupByCategory([])).toEqual([]);
  });
});

describe('BlocksTab', () => {
  it('lists categories with how many blocks each has', () => {
    const { container } = render(<BlocksTab />);
    expect(categoryButton(container, 'Headers').textContent).toBe('Headers26');
  });

  it('opens a category and goes back to the list', () => {
    const { container } = render(<BlocksTab />);
    click(categoryButton(container, 'Content'));
    expect(container.querySelector('h2')?.textContent).toBe('Content');
    expect(container.querySelector('.ve-component-card')?.textContent).toBe('Content, agenda');
    click(getButton(container, 'All categories'));
    expect(container.querySelector('.ve-categories')).not.toBeNull();
  });

  it('searches by name and says when nothing matches', () => {
    const { container } = render(<BlocksTab />);
    searchFor(container, 'footer');
    expect(container.querySelectorAll('.ve-component-card')).toHaveLength(4);
    searchFor(container, 'hologram');
    expect(container.textContent).toContain('No blocks match “hologram”.');
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
      componentId: 'content-agenda',
      label: 'Content, agenda',
    });
    dragController.cancel();
    firePointer(window, 'pointerdown', { button: 0 });
  });
});

describe('BlocksTab with block packs', () => {
  beforeEach(() => {
    runInAct(() => dispatch(blockPacksLoaded([packOf([quoteCardDefinition()])])));
  });

  it('lists packs under My blocks and marks their blocks as custom in their category', () => {
    const { container } = render(<BlocksTab />);
    expect(container.querySelector('.ve-my-blocks')?.textContent).toBe('My blocksAcme blocks1');
    click(categoryButton(container, 'Testimonials'));
    const texts = [...container.querySelectorAll('.ve-component-card')].map(
      (card) => card.textContent,
    );
    expect(texts).toContain('Quote card Custom');
  });

  it('inserts a pack block and embeds its definition in the project', () => {
    const { container } = render(<BlocksTab />);
    click(categoryButton(container, 'Acme blocks'));
    runInAct(() => {
      container.querySelector<HTMLButtonElement>('.ve-component-card')?.click();
    });
    expect(componentIds()).toContain('acme/quote-card');
    expect(store.getState().project.packBlocks['acme/quote-card']).toBeDefined();
  });

  it('finds pack blocks by search', () => {
    const { container } = render(<BlocksTab />);
    searchFor(container, 'author and a few points');
    expect(container.querySelector('.ve-component-card')?.textContent).toBe('Quote card Custom');
  });
});
