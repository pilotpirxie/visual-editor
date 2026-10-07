import { describe, expect, it } from 'vitest';
import { blockOverrideSet, blockValueSet, blockHtmlSet } from '../../app/projectSlice';
import { undo } from '../../app/history';
import type { HtmlBlock } from '../../app/types';
import { createTestStore, homePage, type TestStore } from '../../test/fixtures';
import { convertToHtml, setBlockHtml } from './htmlBlockActions';

function heroId(store: TestStore): string {
  return homePage(store.getState().project).blockIds[1] ?? '';
}

function htmlBlock(store: TestStore, blockId: string): HtmlBlock {
  const block = store.getState().project.blocks.entities[blockId];
  if (block?.kind !== 'html') throw new Error('Expected an HTML block');
  return block;
}

describe('convertToHtml', () => {
  it('replaces the block with its rendered markup and keeps its place and settings', () => {
    const store = createTestStore();
    const blockId = heroId(store);
    store.dispatch(blockOverrideSet(blockId, '--color-background', '#101828', 'discrete'));
    store.dispatch(blockValueSet(blockId, 'title', 'Converted hero', 'discrete'));
    expect(store.dispatch(convertToHtml(blockId))).toBe(true);
    const block = htmlBlock(store, blockId);
    expect(homePage(store.getState().project).blockIds[1]).toBe(blockId);
    expect(block.sourceComponentId).toBe('hero-centered');
    expect(block.html).toContain('class="b-hero-centered section"');
    expect(block.html).toContain('data-component="hero-centered"');
    expect(block.html).toContain('style="--color-background: #101828"');
    expect(block.html).toContain('Converted hero');
    expect(block.html).not.toMatch(/data-block-id|data-field/);
    expect(store.getState().editor.propertiesTab).toBe('code');
  });

  it('is one undo step', () => {
    const store = createTestStore();
    const blockId = heroId(store);
    store.dispatch(convertToHtml(blockId));
    store.dispatch(undo());
    expect(store.getState().project.blocks.entities[blockId]?.kind).toBe('component');
  });

  it('turns page links into plain addresses', () => {
    const store = createTestStore();
    const blockId = heroId(store);
    const homeId = store.getState().project.pages.homePageId;
    store.dispatch(
      blockValueSet(
        blockId,
        'primaryButton',
        {
          label: 'Home',
          link: { type: 'page', pageId: homeId, newTab: false },
          variant: 'primary',
        },
        'discrete',
      ),
    );
    store.dispatch(convertToHtml(blockId));
    expect(htmlBlock(store, blockId).html).toContain('href="index.html"');
  });
});

describe('setBlockHtml', () => {
  it('saves the markup as typed when nothing is unsafe', () => {
    const store = createTestStore();
    const blockId = heroId(store);
    store.dispatch(convertToHtml(blockId));
    const edit = store.dispatch(setBlockHtml(blockId, '<section><p>Hi'));
    expect(edit).toEqual({ html: '<section><p>Hi', removed: [] });
    expect(htmlBlock(store, blockId).html).toBe('<section><p>Hi');
  });

  it('saves the cleaned markup and reports what it removed', () => {
    const store = createTestStore();
    const blockId = heroId(store);
    store.dispatch(convertToHtml(blockId));
    const edit = store.dispatch(setBlockHtml(blockId, '<p onclick="steal()">Hi</p>'));
    expect(edit).toEqual({ html: '<p>Hi</p>', removed: ['onclick attribute'] });
  });

  it('merges typing into one undo step and ignores component blocks', () => {
    const store = createTestStore();
    const blockId = heroId(store);
    store.dispatch(convertToHtml(blockId));
    store.dispatch(blockHtmlSet(blockId, '<p>A</p>', 'continuous'));
    store.dispatch(blockHtmlSet(blockId, '<p>AB</p>', 'continuous'));
    expect(store.getState().history.past).toHaveLength(2);
    const navId = homePage(store.getState().project).blockIds[0] ?? '';
    store.dispatch(blockHtmlSet(navId, '<p>x</p>', 'discrete'));
    expect(store.getState().history.past).toHaveLength(2);
  });

  it('leaves values and overrides of an HTML block alone', () => {
    const store = createTestStore();
    const blockId = heroId(store);
    store.dispatch(convertToHtml(blockId));
    store.dispatch(blockValueSet(blockId, 'title', 'Nope', 'discrete'));
    store.dispatch(blockOverrideSet(blockId, '--color-text', '#000', 'discrete'));
    expect(store.getState().history.past).toHaveLength(1);
  });
});
