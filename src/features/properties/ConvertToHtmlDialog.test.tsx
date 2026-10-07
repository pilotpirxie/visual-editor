import { beforeEach, describe, expect, it, vi } from 'vitest';
import { conversionRequested } from '../../app/editorSlice';
import { undo } from '../../app/history';
import { createSampleProject } from '../../app/projectFactory';
import { dispatch, store } from '../../app/store';
import type { Block } from '../../app/types';
import { click, getButton, render } from '../../test/dom';
import { homePage, loadIntoAppStore } from '../../test/fixtures';
import { setBlockHtml } from '../editor/htmlBlockActions';
import { ConvertToHtmlDialog } from './ConvertToHtmlDialog';

vi.mock('../../persistence/db', () => ({
  putProject: vi.fn(async () => {}),
  getProject: vi.fn(async () => null),
  listProjects: vi.fn(async () => []),
  deleteProject: vi.fn(async () => {}),
}));

let heroId = '';

function blockOf(blockId: string): Block | undefined {
  return store.getState().project.blocks.entities[blockId];
}

function pastSteps(): number {
  return store.getState().history.past.length;
}

function renderDialog(blockId: string): HTMLDivElement {
  dispatch(conversionRequested(blockId));
  return render(<ConvertToHtmlDialog blockId={blockId} />).container;
}

beforeEach(() => {
  const project = loadIntoAppStore(createSampleProject());
  heroId = homePage(project).blockIds[1] ?? '';
});

describe('ConvertToHtmlDialog', () => {
  it('names the block and explains what converting changes', () => {
    const container = renderDialog(heroId);
    expect(container.querySelector('h2')?.textContent).toBe(
      'Convert “Hero, centered text” to HTML?',
    );
    const note = container.querySelector('[role="note"]')?.textContent ?? '';
    expect(note).toContain('Its fields are replaced by its code');
    expect(note).toContain('cannot be turned back into a block later');
    expect(note).toContain('Links to your pages become fixed addresses');
  });

  it('opens as a modal with Cancel focused first', () => {
    const container = renderDialog(heroId);
    expect(container.querySelector('dialog')?.hasAttribute('open')).toBe(true);
    expect(document.activeElement).toBe(getButton(container, 'Cancel'));
  });

  it('replaces the block with an HTML block in place, in one undo step', () => {
    const stepsBefore = pastSteps();
    const container = renderDialog(heroId);
    click(getButton(container, 'Convert to HTML'));
    const converted = blockOf(heroId);
    expect(converted?.kind).toBe('html');
    if (converted?.kind !== 'html') return;
    expect(converted.sourceComponentId).toBe('hero-centered');
    expect(converted.html).toContain('data-component="hero-centered"');
    expect(homePage(store.getState().project).blockIds[1]).toBe(heroId);
    expect(pastSteps()).toBe(stepsBefore + 1);
    dispatch(undo());
    expect(blockOf(heroId)?.kind).toBe('component');
  });

  it('closes and forgets the request after converting', () => {
    const container = renderDialog(heroId);
    click(getButton(container, 'Convert to HTML'));
    expect(container.querySelector('dialog')).toBeNull();
    expect(store.getState().editor.conversionBlockId).toBeNull();
  });

  it('changes nothing on Cancel', () => {
    const projectBefore = store.getState().project;
    const stepsBefore = pastSteps();
    const container = renderDialog(heroId);
    click(getButton(container, 'Cancel'));
    expect(store.getState().project).toBe(projectBefore);
    expect(pastSteps()).toBe(stepsBefore);
    expect(store.getState().editor.conversionBlockId).toBeNull();
  });

  it('renders nothing for a block that is missing', () => {
    const container = renderDialog('missing-block');
    expect(container.querySelector('dialog')).toBeNull();
  });

  it('renders nothing for a block that is already HTML', () => {
    const container = renderDialog(heroId);
    click(getButton(container, 'Convert to HTML'));
    dispatch(setBlockHtml(heroId, '<section>Edited</section>'));
    const again = renderDialog(heroId);
    expect(again.querySelector('dialog')).toBeNull();
  });
});
