import { beforeEach, describe, expect, it, vi } from 'vitest';
import { blockSelected } from '../../app/editorSlice';
import { createBlankProject, createSampleProject } from '../../app/projectFactory';
import { dispatch, store } from '../../app/store';
import type { Project } from '../../app/types';
import { click, firePointer, getButton, render, runInAct } from '../../test/dom';
import { homePage, loadIntoAppStore } from '../../test/fixtures';
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

function projectWithUnknownBlock(): Project {
  const project = createSampleProject();
  const heroId = homePage(project).blockIds[1];
  const hero = project.blocks.entities[heroId];
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
    expect(rowNames(container)[1]).toBe('Missing: retired-hero');
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
    expect(container.querySelector('[data-drop="before"]')?.textContent).toBe(
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
