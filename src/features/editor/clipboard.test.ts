import { describe, expect, it, vi } from 'vitest';
import { blockSelected } from '../../app/editorSlice';
import { undo } from '../../app/history';
import { createSampleProject } from '../../app/projectFactory';
import type { Block, ComponentBlock, Project } from '../../app/types';
import { createBlock } from '../../components/registry';
import { quoteCardDefinition } from '../../test/packFixtures';
import {
  componentBlockOf,
  createTestStore,
  homePage,
  shareNavAndFooter,
  type TestStore,
} from '../../test/fixtures';
import {
  BLOCK_CLIPBOARD_FORMAT,
  blockClipboardPayload,
  copyBlockTo,
  createEnvelope,
  cutBlockTo,
  parseEnvelope,
  pasteEnvelope,
  prepareForPaste,
  type BlockEnvelope,
} from './clipboard';

type SampleIds = { navId: string; heroId: string; featuresId: string; footerId: string };

function sampleIds(project: Project): SampleIds {
  const [navId, heroId, featuresId, footerId] = homePage(project).blockIds;
  return { navId, heroId, featuresId, footerId };
}

function componentBlock(project: Project, blockId: string): ComponentBlock {
  return componentBlockOf(project, blockId);
}

function linkHeroTo(project: Project, pageId: string): void {
  const hero = componentBlock(project, sampleIds(project).heroId);
  hero.values.primaryButton = {
    label: 'About us',
    link: { type: 'page', pageId, newTab: false },
    variant: 'primary',
  };
}

function asComponent(block: Block | undefined): ComponentBlock {
  if (block?.kind !== 'component') throw new Error('Expected a component block');
  return block;
}

function envelopeOf(project: Project, blockId: string): BlockEnvelope {
  const envelope = createEnvelope(project, blockId);
  if (envelope === null) throw new Error('Expected an envelope');
  return envelope;
}

function fakeClipboard(): {
  data: Record<string, string>;
  setData(type: string, value: string): void;
} {
  const data: Record<string, string> = {};
  return {
    data,
    setData(type, value) {
      data[type] = value;
    },
  };
}

describe('createEnvelope and parseEnvelope', () => {
  it('round-trips a block through clipboard text', () => {
    const project = createSampleProject();
    const { heroId } = sampleIds(project);
    const payload = blockClipboardPayload(project, heroId);
    const envelope = parseEnvelope(payload?.text ?? '');
    expect(envelope?.format).toBe(BLOCK_CLIPBOARD_FORMAT);
    expect(envelope?.sourceProjectId).toBe(project.id);
    expect(envelope?.block).toEqual(componentBlock(project, heroId));
  });

  it('renders readable HTML without editor attributes for pasting into documents', () => {
    const project = createSampleProject();
    const html = blockClipboardPayload(project, sampleIds(project).heroId)?.html ?? '';
    expect(html).toContain('Turn customer calls into decisions');
    expect(html).not.toMatch(/data-block-id|data-field/);
  });

  it('carries the resolved value of every token an override points to', () => {
    const project = createSampleProject();
    const { heroId } = sampleIds(project);
    componentBlock(project, heroId).overrides['--color-background'] = 'var(--color-surface)';
    const surface = project.designSystem.tokens['--color-surface']?.value;
    expect(envelopeOf(project, heroId).tokens).toEqual({ '--color-surface': surface });
  });

  it.each([
    ['plain text', 'Hello there'],
    ['JSON of another kind', '{"hello":"world"}'],
    ['broken JSON that mentions the format', `{"format":"${BLOCK_CLIPBOARD_FORMAT}"`],
    [
      'a newer clipboard version',
      JSON.stringify({ format: BLOCK_CLIPBOARD_FORMAT, formatVersion: 2, sourceProjectId: 'p' }),
    ],
  ])('ignores %s', (_name, text) => {
    expect(parseEnvelope(text)).toBeNull();
  });

  it('drops unsafe overrides, classes and anchors from pasted text', () => {
    const project = createSampleProject();
    const envelope = envelopeOf(project, sampleIds(project).heroId);
    const block = {
      ...envelope.block,
      anchor: '1 bad',
      extraClasses: ['ok', 'not ok'],
      overrides: { '--color-text': 'red; } body { display: none', '--color-background': '#fff' },
    };
    const parsed = parseEnvelope(JSON.stringify({ ...envelope, block }));
    expect(parsed?.block.anchor).toBeUndefined();
    expect(parsed?.block.extraClasses).toEqual(['ok']);
    expect(asComponent(parsed?.block).overrides).toEqual({ '--color-background': '#fff' });
  });
});

describe('prepareForPaste', () => {
  it('gives the block a new id and keeps its content', () => {
    const project = createSampleProject();
    const { heroId } = sampleIds(project);
    const prepared = prepareForPaste(envelopeOf(project, heroId), project, 'new-id');
    expect(prepared?.block.id).toBe('new-id');
    expect(asComponent(prepared?.block).values).toEqual(componentBlock(project, heroId).values);
    expect(prepared?.clearedLinkCount).toBe(0);
  });

  it('clears links to pages the target project does not have', () => {
    const source = createSampleProject();
    linkHeroTo(source, 'about');
    const target = createSampleProject();
    const envelope = envelopeOf(source, sampleIds(source).heroId);
    const prepared = prepareForPaste(envelope, target, 'new-id');
    expect(prepared?.clearedLinkCount).toBe(1);
    expect(asComponent(prepared?.block).values.primaryButton).toMatchObject({
      label: 'About us',
      link: { type: 'url', url: '#', newTab: false },
    });
  });

  it('fills values the copied block is missing from its definition', () => {
    const project = createSampleProject();
    const { heroId } = sampleIds(project);
    const envelope = envelopeOf(project, heroId);
    const copied = asComponent(envelope.block);
    const current = componentBlock(project, heroId);
    delete copied.values.title;
    const pasted = asComponent(prepareForPaste(envelope, project, 'new-id')?.block);
    expect(pasted.values.title).toBe(current.values.title);
  });

  it('keeps links to pages that exist in the target project', () => {
    const project = createSampleProject();
    linkHeroTo(project, project.pages.homePageId);
    const envelope = envelopeOf(project, sampleIds(project).heroId);
    expect(prepareForPaste(envelope, project, 'new-id')?.clearedLinkCount).toBe(0);
  });

  it('clears page links inside list items', () => {
    const source = createSampleProject();
    const { navId } = sampleIds(source);
    componentBlock(source, navId).values.links = [
      { label: 'Pricing', link: { type: 'page', pageId: 'pricing', newTab: false } },
    ];
    const prepared = prepareForPaste(envelopeOf(source, navId), createSampleProject(), 'n');
    expect(prepared?.clearedLinkCount).toBe(1);
    expect(asComponent(prepared?.block).values.links).toEqual([
      { label: 'Pricing', link: { type: 'url', url: '#', newTab: false } },
    ]);
  });

  it('replaces an override that points to a missing token with its resolved value', () => {
    const source = createSampleProject();
    const { heroId } = sampleIds(source);
    componentBlock(source, heroId).overrides['--color-background'] = 'var(--color-surface)';
    const envelope = envelopeOf(source, heroId);
    const target = createSampleProject();
    delete target.designSystem.tokens['--color-surface'];
    const prepared = prepareForPaste(envelope, target, 'new-id');
    expect(asComponent(prepared?.block).overrides['--color-background']).toBe(
      envelope.tokens['--color-surface'],
    );
  });

  it('refuses a block whose component is not in the library', () => {
    const project = createSampleProject();
    const envelope = envelopeOf(project, sampleIds(project).heroId);
    const unknown = { ...envelope, block: { ...envelope.block, componentId: 'from-the-future' } };
    expect(prepareForPaste(unknown, project, 'new-id')).toBeNull();
  });
});

function pageComponents(store: TestStore): string[] {
  const { project } = store.getState();
  const ids: string[] = [];
  for (const blockId of homePage(project).blockIds) {
    ids.push(componentBlock(project, blockId).componentId);
  }
  return ids;
}

describe('copy, cut and paste thunks', () => {
  it('copies the block, keeps it for the menu and pastes a copy after the selection', async () => {
    const store = createTestStore();
    const { heroId } = sampleIds(store.getState().project);
    const clipboard = fakeClipboard();
    expect(store.dispatch(copyBlockTo(heroId, clipboard))).toBe(true);
    expect(store.getState().editor.clipboardText).toBe(clipboard.data['text/plain']);
    store.dispatch(blockSelected(heroId));
    const envelope = parseEnvelope(clipboard.data['text/plain'] ?? '');
    if (envelope === null) throw new Error('Expected a block on the clipboard');
    await store.dispatch(pasteEnvelope(envelope));
    expect(pageComponents(store)).toEqual([
      'nav-simple',
      'hero-centered',
      'hero-centered',
      'features-grid-3',
      'footer-simple',
    ]);
    const pastedId = homePage(store.getState().project).blockIds[2];
    expect(pastedId).not.toBe(heroId);
    expect(store.getState().editor.selectedBlockId).toBe(pastedId);
  });

  it('cuts in one undo step and the undo brings the block back', () => {
    const store = createTestStore();
    const { heroId } = sampleIds(store.getState().project);
    store.dispatch(cutBlockTo(heroId, fakeClipboard()));
    expect(pageComponents(store)).not.toContain('hero-centered');
    store.dispatch(undo());
    expect(pageComponents(store)).toContain('hero-centered');
  });

  it('pastes into another project and warns about the cleared links', async () => {
    const source = createSampleProject();
    linkHeroTo(source, 'about');
    const store = createTestStore();
    await store.dispatch(pasteEnvelope(envelopeOf(source, sampleIds(source).heroId)));
    const { notices } = store.getState().editor;
    expect(notices).toHaveLength(1);
    expect(notices[0]).toMatchObject({ tone: 'warning' });
    expect(notices[0]?.text).toContain('was cleared');
  });

  it('pastes a navigation after a selected shared header block, into the shared header', async () => {
    const store = createTestStore();
    const { navId } = shareNavAndFooter(store);
    store.dispatch(blockSelected(navId));
    await store.dispatch(pasteEnvelope(envelopeOf(store.getState().project, navId)));
    expect(store.getState().project.sharedSlots.header).toHaveLength(2);
  });

  it('pastes a non-navigation block at the top of the page when a header block is selected', async () => {
    const store = createTestStore();
    const { navId } = shareNavAndFooter(store);
    const [heroId] = homePage(store.getState().project).blockIds;
    store.dispatch(blockSelected(navId));
    await store.dispatch(pasteEnvelope(envelopeOf(store.getState().project, heroId)));
    expect(store.getState().project.sharedSlots.header).toHaveLength(1);
    expect(pageComponents(store)).toEqual(['hero-centered', 'hero-centered', 'features-grid-3']);
  });

  it('shows an error when the block needs a component this editor does not have', async () => {
    const store = createTestStore();
    const envelope = envelopeOf(
      store.getState().project,
      sampleIds(store.getState().project).heroId,
    );
    const unknown = { ...envelope, block: { ...envelope.block, componentId: 'from-the-future' } };
    await store.dispatch(pasteEnvelope(unknown));
    expect(store.getState().editor.notices[0]?.tone).toBe('error');
    expect(homePage(store.getState().project).blockIds).toHaveLength(4);
  });
});

describe('custom blocks on the clipboard', () => {
  function projectWithCustomBlock(): { project: Project; blockId: string } {
    const project = createSampleProject();
    const custom = quoteCardDefinition();
    project.packBlocks[custom.definition.id] = custom;
    const block = createBlock(custom.definition);
    block.values.quote = 'Pasted with its definition';
    project.blocks.ids.push(block.id);
    project.blocks.entities[block.id] = block;
    homePage(project).blockIds.push(block.id);
    return { project, blockId: block.id };
  }

  it('carries the definition so the block can be pasted into a project without the pack', async () => {
    const { project, blockId } = projectWithCustomBlock();
    const text = JSON.stringify(envelopeOf(project, blockId));
    const envelope = parseEnvelope(text);
    if (envelope === null) throw new Error('Expected an envelope');
    expect(Object.keys(envelope.packBlocks)).toEqual(['acme/quote-card']);
    const store = createTestStore();
    await store.dispatch(pasteEnvelope(envelope));
    const target = store.getState().project;
    expect(target.packBlocks['acme/quote-card']).toBeDefined();
    const pasted = target.blocks.entities[homePage(target).blockIds.at(-1) ?? ''];
    expect(asComponent(pasted).values.quote).toBe('Pasted with its definition');
    expect(store.getState().editor.notices[0]?.text).toContain('not in your library');
    store.dispatch(undo());
    expect(store.getState().project.packBlocks).toEqual({});
  });

  it('refuses a pasted definition that does not pass validation', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { project, blockId } = projectWithCustomBlock();
    const envelope = envelopeOf(project, blockId);
    const custom = envelope.packBlocks['acme/quote-card'];
    if (custom === undefined) throw new Error('Expected the definition');
    envelope.packBlocks['acme/quote-card'] = {
      ...custom,
      template: '<section class="b-acme-quote-card" onclick="steal()">x</section>',
    };
    const store = createTestStore();
    await store.dispatch(pasteEnvelope(envelope));
    expect(store.getState().project.packBlocks).toEqual({});
    expect(store.getState().editor.notices[0]?.text).toContain('custom block is not valid');
  });
});
