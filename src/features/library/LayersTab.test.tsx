import { beforeEach, describe, expect, it, vi } from 'vitest';
import { blockSelected } from '../../app/editorSlice';
import { blockRemoved, pageSharedSlotShown } from '../../app/projectSlice';
import { createBlankProject, createSampleProject } from '../../app/projectFactory';
import { dispatch, store } from '../../app/store';
import type { Project } from '../../app/types';
import { click, firePointer, getButton, render, runInAct } from '../../test/dom';
import {
  componentBlockOf,
  homePage,
  loadIntoAppStore,
  shareNavAndFooter,
} from '../../test/fixtures';
import { dragController } from '../canvas/dragController';
import { LayersTab } from './LayersTab';

vi.mock('../../persistence/db', () => ({
  putProject: vi.fn(async () => {}),
  getProject: vi.fn(async () => null),
  listProjects: vi.fn(async () => []),
  deleteProject: vi.fn(async () => {}),
}));

const ROW_HEIGHT = 40;
const LIST_WIDTH = 240;

function blockIds(): string[] {
  return homePage(store.getState().project).blockIds;
}

function rowNames(container: HTMLElement): string[] {
  const names: string[] = [];
  for (const name of container.querySelectorAll('.ve-layer-name')) {
    names.push(name.textContent ?? '');
  }
  return names;
}

function layoutRows(container: HTMLElement): void {
  const list = container.querySelector('ol');
  if (list === null) throw new Error('The layers list is not rendered');
  const rowCount = list.children.length;
  list.getBoundingClientRect = () => new DOMRect(0, 0, LIST_WIDTH, rowCount * ROW_HEIGHT);
  for (const [index, row] of [...list.children].entries()) {
    row.getBoundingClientRect = () => new DOMRect(0, index * ROW_HEIGHT, LIST_WIDTH, ROW_HEIGHT);
  }
}

function layoutList(list: Element, top: number): void {
  const rowCount = list.children.length;
  list.getBoundingClientRect = () => new DOMRect(0, top, LIST_WIDTH, rowCount * ROW_HEIGHT);
  for (const [index, row] of [...list.children].entries()) {
    row.getBoundingClientRect = () =>
      new DOMRect(0, top + index * ROW_HEIGHT, LIST_WIDTH, ROW_HEIGHT);
  }
}

function layoutGroups(container: HTMLElement): void {
  const tops: Record<string, number> = {
    'Shared header': 0,
    'Blocks on this page': 100,
    'Shared footer': 300,
  };
  for (const list of container.querySelectorAll('ol')) {
    layoutList(list, tops[list.getAttribute('aria-label') ?? '']);
  }
}

function groupTitles(container: HTMLElement): string[] {
  const titles: string[] = [];
  for (const title of container.querySelectorAll('.ui-section-title')) {
    titles.push(title.textContent ?? '');
  }
  return titles;
}

function dragRow(container: HTMLElement, name: string, fromY: number, toY: number): void {
  const row = getButton(container, name).closest('.ve-layer');
  if (row === null) throw new Error(`No layer row for ${name}`);
  firePointer(row, 'pointerdown', { clientX: 10, clientY: fromY, button: 0, buttons: 1 });
  firePointer(window, 'pointermove', { clientX: 10, clientY: toY, buttons: 1 });
}

function projectWithUnknownBlock(): Project {
  const project = createSampleProject();
  const heroId = homePage(project).blockIds[1];
  const hero = componentBlockOf(project, heroId);
  return {
    ...project,
    blocks: {
      ...project.blocks,
      entities: { ...project.blocks.entities, [heroId]: { ...hero, componentId: 'retired-hero' } },
    },
  };
}

beforeEach(() => {
  loadIntoAppStore();
});

describe('LayersTab', () => {
  it('lists the blocks of the page in order by component name', () => {
    const { container } = render(<LayersTab />);
    expect(rowNames(container)).toEqual([
      'Navigation, logo left',
      'Hero, centered text',
      'Features grid, 3 columns',
      'Footer, simple',
    ]);
  });

  it('names blocks whose component is no longer in the library', () => {
    loadIntoAppStore(projectWithUnknownBlock());
    const { container } = render(<LayersTab />);
    expect(rowNames(container)[1]).toBe('Missing component: retired-hero');
  });

  it('selects a block from its row and marks the selected row', () => {
    const { container } = render(<LayersTab />);
    click(getButton(container, 'Hero, centered text'));
    expect(store.getState().editor.selectedBlockId).toBe(blockIds()[1]);
    expect(getButton(container, 'Hero, centered text').getAttribute('aria-current')).toBe('true');
  });

  it('follows a selection made elsewhere', () => {
    const { container } = render(<LayersTab />);
    runInAct(() => dispatch(blockSelected(blockIds()[3])));
    expect(getButton(container, 'Footer, simple').getAttribute('aria-current')).toBe('true');
  });

  it('disables and enables a block with the eye button', () => {
    const { container } = render(<LayersTab />);
    click(getButton(container, 'Disable Hero, centered text'));
    expect(store.getState().project.blocks.entities[blockIds()[1]].disabled).toBe(true);
    click(getButton(container, 'Enable Hero, centered text'));
    expect(store.getState().project.blocks.entities[blockIds()[1]].disabled).toBe(false);
  });

  it('says so when the page has no blocks', () => {
    loadIntoAppStore(createBlankProject('Empty'));
    const { container } = render(<LayersTab />);
    expect(container.textContent).toBe('This page has no blocks yet.');
  });

  it('reorders the page when a row is dragged to another gap', () => {
    const { container } = render(<LayersTab />);
    layoutRows(container);
    const [nav] = blockIds();
    const navRow = container.querySelector('.ve-layer');
    if (navRow === null) throw new Error('No layer rows');
    firePointer(navRow, 'pointerdown', { clientX: 10, clientY: 10, button: 0, buttons: 1 });
    firePointer(window, 'pointermove', { clientX: 10, clientY: 90, buttons: 1 });
    expect(container.querySelector('[data-drop="before"] .ve-layer-name')?.textContent).toBe(
      'Features grid, 3 columns',
    );
    firePointer(window, 'pointerup', { clientX: 10, clientY: 90, buttons: 0 });
    expect(blockIds()[1]).toBe(nav);
    expect(dragController.isActive()).toBe(false);
  });

  it('does not start a drag from a row with touch, so the list can scroll', () => {
    const { container } = render(<LayersTab />);
    layoutRows(container);
    const navRow = container.querySelector('.ve-layer');
    if (navRow === null) throw new Error('No layer rows');
    firePointer(navRow, 'pointerdown', {
      clientX: 10,
      clientY: 10,
      button: 0,
      pointerType: 'touch',
    });
    firePointer(window, 'pointermove', { clientX: 10, clientY: 90, buttons: 1 });
    expect(dragController.isActive()).toBe(false);
    firePointer(window, 'pointerup', { clientX: 10, clientY: 90, buttons: 0 });
  });

  it('starts a touch drag from the grip handle', () => {
    const { container } = render(<LayersTab />);
    layoutRows(container);
    const [nav] = blockIds();
    const grip = container.querySelector('.ve-layer-grip');
    if (grip === null) throw new Error('No grip handle');
    firePointer(grip, 'pointerdown', { clientX: 10, clientY: 10, button: 0, pointerType: 'touch' });
    firePointer(window, 'pointermove', { clientX: 10, clientY: 130, buttons: 1 });
    expect(dragController.isActive()).toBe(true);
    firePointer(window, 'pointerup', { clientX: 10, clientY: 130, buttons: 0 });
    expect(blockIds()[2]).toBe(nav);
  });
});

describe('LayersTab with shared blocks', () => {
  it('groups the shared header, the page and the shared footer', () => {
    shareNavAndFooter();
    const { container } = render(<LayersTab />);
    expect(groupTitles(container)).toEqual(['Shared header', 'This page', 'Shared footer']);
    expect(rowNames(container)).toEqual([
      'Navigation, logo left',
      'Hero, centered text',
      'Features grid, 3 columns',
      'Footer, simple',
    ]);
  });

  it('leaves out a shared slot the page hides', () => {
    shareNavAndFooter();
    const pageId = homePage(store.getState().project).id;
    dispatch(pageSharedSlotShown({ pageId, slot: 'footer', isShown: false }));
    const { container } = render(<LayersTab />);
    expect(groupTitles(container)).toEqual(['Shared header', 'This page']);
    expect(rowNames(container)).not.toContain('Footer, simple');
  });

  it('keeps the page group when the page itself has no blocks', () => {
    shareNavAndFooter();
    for (const blockId of blockIds()) dispatch(blockRemoved({ blockId }));
    const { container } = render(<LayersTab />);
    expect(groupTitles(container)).toEqual(['Shared header', 'This page', 'Shared footer']);
    expect(container.textContent).toContain('This page has no blocks yet.');
  });

  it('reorders page blocks within the page group', () => {
    shareNavAndFooter();
    const [hero] = blockIds();
    const { container } = render(<LayersTab />);
    layoutGroups(container);
    dragRow(container, 'Hero, centered text', 110, 175);
    firePointer(window, 'pointerup', { clientX: 10, clientY: 175, buttons: 0 });
    expect(blockIds()[1]).toBe(hero);
    expect(store.getState().project.sharedSlots.header).toHaveLength(1);
  });

  it('does not let a shared block land among the page blocks', () => {
    const { navId } = shareNavAndFooter();
    const pageBefore = blockIds();
    const { container } = render(<LayersTab />);
    layoutGroups(container);
    dragRow(container, 'Navigation, logo left', 10, 150);
    expect(container.querySelector('[data-drop]')).toBeNull();
    firePointer(window, 'pointerup', { clientX: 10, clientY: 150, buttons: 0 });
    expect(blockIds()).toEqual(pageBefore);
    expect(store.getState().project.sharedSlots.header).toEqual([navId]);
  });

  it('does not let a page block land in a shared slot', () => {
    const { footerId } = shareNavAndFooter();
    const pageBefore = blockIds();
    const { container } = render(<LayersTab />);
    layoutGroups(container);
    dragRow(container, 'Hero, centered text', 110, 310);
    expect(container.querySelector('[data-drop]')).toBeNull();
    firePointer(window, 'pointerup', { clientX: 10, clientY: 310, buttons: 0 });
    expect(blockIds()).toEqual(pageBefore);
    expect(store.getState().project.sharedSlots.footer).toEqual([footerId]);
  });
});

describe('LayersTab context menu', () => {
  it('selects the block and opens its actions on right-click', () => {
    const { container } = render(<LayersTab />);
    const row = container.querySelectorAll('.ve-layer')[1];
    if (row === undefined) throw new Error('Expected a second layer row');
    runInAct(() => {
      row.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, clientX: 20, clientY: 30 }));
    });
    expect(store.getState().editor.selectedBlockId).toBe(blockIds()[1]);
    const menu = container.querySelector('[role="menu"][aria-label="Hero, centered text actions"]');
    if (menu === null) throw new Error('Expected the right-click menu');
    const duplicate = getButton(menu, 'Duplicate');
    firePointer(duplicate, 'pointerdown', { button: 0 });
    click(duplicate);
    expect(blockIds()).toHaveLength(5);
  });

  it('offers the same actions from a button on every row, for touch screens', () => {
    const { container } = render(<LayersTab />);
    const menu = container.querySelector(
      '[role="menu"][aria-label="More actions for Hero, centered text"]',
    );
    if (menu === null) throw new Error('Expected a row menu');
    expect(
      getButton(container, 'More actions for Hero, centered text').getAttribute('aria-haspopup'),
    ).toBe('menu');
    click(getButton(menu, 'Duplicate'));
    expect(blockIds()).toHaveLength(5);
  });
});
