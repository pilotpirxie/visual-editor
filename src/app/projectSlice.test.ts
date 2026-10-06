import { describe, expect, it } from 'vitest';
import { createTestStore, homePage, type TestStore } from '../test/fixtures';
import { blockSelected, pageOpened } from './editorSlice';
import { undo } from './history';
import {
  blockAdvancedSet,
  blockDisabledSet,
  blockDuplicated,
  blockInserted,
  blockMoved,
  blockOverrideRemoved,
  blockOverrideSet,
  blockRemoved,
  blockShared,
  blockUnshared,
  blockValueSet,
  fontSet,
  pageAdded,
  pageSharedSlotShown,
  tokenSet,
  tokensSet,
} from './projectSlice';

function pageBlockIds(store: TestStore): string[] {
  return homePage(store.getState().project).blockIds;
}

function componentIds(store: TestStore): string[] {
  const { entities } = store.getState().project.blocks;
  const ids: string[] = [];
  for (const blockId of pageBlockIds(store)) ids.push(entities[blockId].componentId);
  return ids;
}

function homePageId(store: TestStore): string {
  return store.getState().project.pages.homePageId;
}

describe('blockInserted', () => {
  it('inserts a block with its default values at the given index and selects it', () => {
    const store = createTestStore();
    store.dispatch(blockInserted(homePageId(store), 2, 'cta-centered'));
    const inserted = store.getState().project.blocks.entities[pageBlockIds(store)[2]];
    expect(componentIds(store)[2]).toBe('cta-centered');
    expect(inserted.values.title).toBe('Your next customer call could be your best roadmap input');
    expect(store.getState().editor.selectedBlockId).toBe(inserted.id);
  });

  it('clamps an index past the end to the end of the page', () => {
    const store = createTestStore();
    store.dispatch(blockInserted(homePageId(store), 99, 'cta-centered'));
    expect(componentIds(store).at(-1)).toBe('cta-centered');
  });

  it('throws for a component that is not in the library', () => {
    const store = createTestStore();
    expect(() => blockInserted(homePageId(store), 0, 'no-such-block')).toThrow(
      'Cannot insert unknown component "no-such-block"',
    );
  });

  it('changes nothing and selects nothing when the page does not exist', () => {
    const store = createTestStore();
    const before = store.getState().project;
    store.dispatch(blockInserted('missing-page', 0, 'cta-centered'));
    expect(store.getState().project).toBe(before);
    expect(store.getState().editor.selectedBlockId).toBeNull();
  });
});

describe('blockMoved', () => {
  it('moves a block to a new index', () => {
    const store = createTestStore();
    const footer = pageBlockIds(store)[3];
    store.dispatch(blockMoved({ blockId: footer, toIndex: 0 }));
    expect(componentIds(store)[0]).toBe('footer-simple');
  });

  it('clamps an out-of-range index to the last position', () => {
    const store = createTestStore();
    const nav = pageBlockIds(store)[0];
    store.dispatch(blockMoved({ blockId: nav, toIndex: 99 }));
    expect(componentIds(store).at(-1)).toBe('nav-simple');
  });

  it('records no undo step for a move to the same index or of an unknown block', () => {
    const store = createTestStore();
    const hero = pageBlockIds(store)[1];
    store.dispatch(blockMoved({ blockId: hero, toIndex: 1 }));
    store.dispatch(blockMoved({ blockId: 'missing', toIndex: 0 }));
    expect(store.getState().history.past).toHaveLength(0);
  });
});

describe('blockDuplicated', () => {
  it('places a deep copy right after the source and selects it', () => {
    const store = createTestStore();
    const source = pageBlockIds(store)[2];
    store.dispatch(blockDuplicated(source));
    const copyId = pageBlockIds(store)[3];
    const { entities } = store.getState().project.blocks;
    expect(copyId).not.toBe(source);
    expect(entities[copyId].values).toEqual(entities[source].values);
    expect(entities[copyId].values.items).not.toBe(entities[source].values.items);
    expect(store.getState().editor.selectedBlockId).toBe(copyId);
  });

  it('selects nothing when the source block does not exist', () => {
    const store = createTestStore();
    store.dispatch(blockDuplicated('missing'));
    expect(pageBlockIds(store)).toHaveLength(4);
    expect(store.getState().editor.selectedBlockId).toBeNull();
  });
});

describe('blockRemoved', () => {
  it('removes the block from the page and the project and clears its selection', () => {
    const store = createTestStore();
    store.dispatch(blockInserted(homePageId(store), 0, 'cta-centered'));
    const inserted = pageBlockIds(store)[0];
    store.dispatch(blockRemoved({ blockId: inserted }));
    expect(pageBlockIds(store)).not.toContain(inserted);
    expect(store.getState().project.blocks.entities[inserted]).toBeUndefined();
    expect(store.getState().editor.selectedBlockId).toBeNull();
  });

  it('keeps the selection when another block is removed', () => {
    const store = createTestStore();
    const [nav, hero] = pageBlockIds(store);
    store.dispatch(blockDuplicated(hero));
    const selected = store.getState().editor.selectedBlockId;
    store.dispatch(blockRemoved({ blockId: nav }));
    expect(store.getState().editor.selectedBlockId).toBe(selected);
  });
});

describe('blockDisabledSet', () => {
  it('disables and re-enables a block without removing it from the page', () => {
    const store = createTestStore();
    const blockId = pageBlockIds(store)[1];
    store.dispatch(blockDisabledSet({ blockId, disabled: true }));
    expect(store.getState().project.blocks.entities[blockId].disabled).toBe(true);
    expect(pageBlockIds(store)).toContain(blockId);
    store.dispatch(blockDisabledSet({ blockId, disabled: false }));
    expect(store.getState().project.blocks.entities[blockId].disabled).toBe(false);
  });
});

describe('blockValueSet', () => {
  it('sets a field value on the block', () => {
    const store = createTestStore();
    const blockId = pageBlockIds(store)[1];
    store.dispatch(blockValueSet(blockId, 'title', 'Ship what customers asked for', 'continuous'));
    expect(store.getState().project.blocks.entities[blockId].values.title).toBe(
      'Ship what customers asked for',
    );
  });

  it('ignores blocks that do not exist', () => {
    const store = createTestStore();
    const before = store.getState().project;
    store.dispatch(blockValueSet('missing', 'title', 'Nothing', 'continuous'));
    expect(store.getState().project).toBe(before);
  });

  it('asks to merge typing into one undo step per block field', () => {
    const action = blockValueSet('block-1', 'title', 'Hello', 'continuous');
    expect(action.meta.mergeKey).toBe('value:block-1:title');
    expect(action.meta.at).toBeTypeOf('number');
  });

  it('never asks to merge discrete edits such as toggles and list changes', () => {
    const action = blockValueSet('block-1', 'featured', true, 'discrete');
    expect(action.meta.mergeKey).toBeNull();
  });
});

function heroOverrides(store: TestStore): Record<string, string> {
  return store.getState().project.blocks.entities[pageBlockIds(store)[1]].overrides;
}

describe('blockOverrideSet', () => {
  it('stores a token override on the block', () => {
    const store = createTestStore();
    const heroId = pageBlockIds(store)[1];
    store.dispatch(
      blockOverrideSet(heroId, '--color-background', 'var(--color-surface)', 'discrete'),
    );
    expect(heroOverrides(store)).toEqual({ '--color-background': 'var(--color-surface)' });
  });

  it('removes the override when the value points back to the same token', () => {
    const store = createTestStore();
    const heroId = pageBlockIds(store)[1];
    store.dispatch(blockOverrideSet(heroId, '--color-text', '#ffffff', 'discrete'));
    store.dispatch(blockOverrideSet(heroId, '--color-text', 'var(--color-text)', 'discrete'));
    expect(heroOverrides(store)).toEqual({});
  });

  it.each([
    ['a value that could escape the style attribute', '--color-text', 'red; position: fixed'],
    ['a token the block does not offer', '--radius-md', '0'],
    ['an empty value', '--color-text', '  '],
  ])('ignores %s', (_name, token, value) => {
    const store = createTestStore();
    const heroId = pageBlockIds(store)[1];
    store.dispatch(blockOverrideSet(heroId, token, value, 'discrete'));
    expect(heroOverrides(store)).toEqual({});
  });

  it('refuses overrides that point at each other', () => {
    const store = createTestStore();
    const heroId = pageBlockIds(store)[1];
    store.dispatch(blockOverrideSet(heroId, '--color-text', 'var(--color-background)', 'discrete'));
    store.dispatch(blockOverrideSet(heroId, '--color-background', 'var(--color-text)', 'discrete'));
    expect(heroOverrides(store)).toEqual({ '--color-text': 'var(--color-background)' });
  });

  it('merges continuous edits of one override into one undo step', () => {
    const action = blockOverrideSet('block-1', '--color-text', '#111111', 'continuous');
    expect(action.meta.mergeKey).toBe('override:block-1:--color-text');
  });
});

describe('blockOverrideRemoved', () => {
  it('resets an override so the block follows the design system again', () => {
    const store = createTestStore();
    const heroId = pageBlockIds(store)[1];
    store.dispatch(blockOverrideSet(heroId, '--section-padding-y', 'var(--space-8)', 'discrete'));
    store.dispatch(blockOverrideRemoved({ blockId: heroId, token: '--section-padding-y' }));
    expect(heroOverrides(store)).toEqual({});
  });
});

function hero(store: TestStore) {
  return store.getState().project.blocks.entities[pageBlockIds(store)[1]];
}

describe('blockAdvancedSet', () => {
  it('sets and clears the anchor id', () => {
    const store = createTestStore();
    const heroId = pageBlockIds(store)[1];
    store.dispatch(blockAdvancedSet(heroId, { key: 'anchor', value: ' pricing ' }, 'continuous'));
    expect(hero(store).anchor).toBe('pricing');
    store.dispatch(blockAdvancedSet(heroId, { key: 'anchor', value: '' }, 'continuous'));
    expect(hero(store).anchor).toBeUndefined();
  });

  it('keeps the old anchor when the new one is not a valid id', () => {
    const store = createTestStore();
    const heroId = pageBlockIds(store)[1];
    store.dispatch(blockAdvancedSet(heroId, { key: 'anchor', value: 'top' }, 'discrete'));
    store.dispatch(blockAdvancedSet(heroId, { key: 'anchor', value: 'Top Section' }, 'discrete'));
    expect(hero(store).anchor).toBe('top');
  });

  it('stores extra classes once each and rejects invalid class names', () => {
    const store = createTestStore();
    const heroId = pageBlockIds(store)[1];
    store.dispatch(
      blockAdvancedSet(heroId, { key: 'extraClasses', value: ['a', 'b', 'a'] }, 'discrete'),
    );
    expect(hero(store).extraClasses).toEqual(['a', 'b']);
    store.dispatch(
      blockAdvancedSet(heroId, { key: 'extraClasses', value: ['ok', '"bad'] }, 'discrete'),
    );
    expect(hero(store).extraClasses).toEqual(['a', 'b']);
  });

  it('stores the devices to hide on in a fixed order and drops unknown ones', () => {
    const store = createTestStore();
    const heroId = pageBlockIds(store)[1];
    store.dispatch(
      blockAdvancedSet(heroId, { key: 'hideOn', value: ['desktop', 'phone'] }, 'discrete'),
    );
    expect(hero(store).hideOn).toEqual(['phone', 'desktop']);
  });

  it('merges typing into one undo step per block setting', () => {
    const action = blockAdvancedSet('block-1', { key: 'anchor', value: 'a' }, 'continuous');
    expect(action.meta.mergeKey).toBe('advanced:block-1:anchor');
  });
});

describe('tokenSet', () => {
  it('changes a design token value', () => {
    const store = createTestStore();
    store.dispatch(tokenSet({ name: '--color-primary', value: '#0f766e' }, 'continuous'));
    expect(store.getState().project.designSystem.tokens['--color-primary'].value).toBe('#0f766e');
  });

  it('ignores values that could break out of the token declaration', () => {
    const store = createTestStore();
    store.dispatch(tokenSet({ name: '--color-primary', value: 'red; } body {' }, 'discrete'));
    expect(store.getState().project.designSystem.tokens['--color-primary'].value).toBe('#4f46e5');
  });

  it('ignores tokens that do not exist', () => {
    const store = createTestStore();
    store.dispatch(tokenSet({ name: '--color-unknown', value: 'red' }, 'discrete'));
    expect(store.getState().project.designSystem.tokens['--color-unknown']).toBeUndefined();
  });

  it('merges only continuous token edits', () => {
    const picked = tokenSet({ name: '--font-heading', value: 'serif' }, 'discrete');
    const dragged = tokenSet({ name: '--color-primary', value: '#000000' }, 'continuous');
    expect(picked.meta.mergeKey).toBeNull();
    expect(dragged.meta.mergeKey).toBe('token:--color-primary');
  });
});

describe('tokensSet', () => {
  it('changes several tokens and the generator settings in one undo step', () => {
    const store = createTestStore();
    store.dispatch(
      tokensSet(
        {
          values: { '--space-1': '0.5rem', '--space-2': '1rem' },
          generators: { spaceUnitPx: 8 },
        },
        'continuous',
      ),
    );
    const { tokens, generators } = store.getState().project.designSystem;
    expect(tokens['--space-1'].value).toBe('0.5rem');
    expect(tokens['--space-2'].value).toBe('1rem');
    expect(generators.spaceUnitPx).toBe(8);
    expect(store.getState().history.past).toHaveLength(1);
  });

  it('skips unknown tokens, unsafe values and generator settings that are not positive numbers', () => {
    const store = createTestStore();
    store.dispatch(
      tokensSet(
        {
          values: { '--missing': '1rem', '--space-1': 'url(x)', '--space-2': '9px' },
          generators: { typeBasePx: -1, typeRatio: Number.NaN },
        },
        'discrete',
      ),
    );
    const { tokens, generators } = store.getState().project.designSystem;
    expect(tokens['--missing']).toBeUndefined();
    expect(tokens['--space-1'].value).toBe('0.25rem');
    expect(tokens['--space-2'].value).toBe('9px');
    expect(generators).toEqual({ typeBasePx: 16, typeRatio: 1.25, spaceUnitPx: 4 });
  });

  it('merges continuous edits of the same set of tokens', () => {
    const first = tokensSet({ values: { '--b': '1', '--a': '2' } }, 'continuous');
    const second = tokensSet({ values: { '--a': '3', '--b': '4' } }, 'continuous');
    expect(first.meta.mergeKey).toBe('tokens:--a,--b');
    expect(second.meta.mergeKey).toBe(first.meta.mergeKey);
  });
});

describe('fontSet', () => {
  it('sets the font of a role and its token in one undo step', () => {
    const store = createTestStore();
    store.dispatch(
      fontSet({
        role: 'heading',
        selection: { family: 'Lora', weights: [700, 400, 700] },
        stack: '"Lora", ui-serif, Georgia, serif',
      }),
    );
    const { fonts, tokens } = store.getState().project.designSystem;
    expect(fonts).toEqual([{ role: 'heading', family: 'Lora', weights: [400, 700] }]);
    expect(tokens['--font-heading'].value).toBe('"Lora", ui-serif, Georgia, serif');
    expect(store.getState().history.past).toHaveLength(1);
  });

  it('replaces the font of the same role and goes back to a system font', () => {
    const store = createTestStore();
    const lora = { family: 'Lora', weights: [400] };
    store.dispatch(fontSet({ role: 'body', selection: lora, stack: '"Lora", serif' }));
    store.dispatch(fontSet({ role: 'body', selection: null, stack: 'system-ui, sans-serif' }));
    const { fonts, tokens } = store.getState().project.designSystem;
    expect(fonts).toEqual([]);
    expect(tokens['--font-body'].value).toBe('system-ui, sans-serif');
  });

  it.each([
    ['weights that are not font weights', { family: 'Lora', weights: [450, 0] }, '"Lora", serif'],
    ['an empty family name', { family: ' ', weights: [400] }, 'serif'],
    ['an unsafe font stack', { family: 'Lora', weights: [400] }, 'serif; color: red'],
  ])('ignores %s', (_name, selection, stack) => {
    const store = createTestStore();
    const before = store.getState().project;
    store.dispatch(fontSet({ role: 'body', selection, stack }));
    expect(store.getState().project).toBe(before);
  });
});

function shareNavAndFooter(store: TestStore): { navId: string; footerId: string } {
  const [navId, , , footerId] = pageBlockIds(store);
  const pageId = homePageId(store);
  store.dispatch(blockShared({ blockId: navId, slot: 'header', pageId }));
  store.dispatch(blockShared({ blockId: footerId, slot: 'footer', pageId }));
  return { navId, footerId };
}

describe('blockShared', () => {
  it('moves a navigation into the shared header and a footer into the shared footer', () => {
    const store = createTestStore();
    const { navId, footerId } = shareNavAndFooter(store);
    expect(store.getState().project.sharedSlots).toEqual({ header: [navId], footer: [footerId] });
    expect(componentIds(store)).toEqual(['hero-centered', 'features-grid-3']);
  });

  it('refuses blocks whose category does not belong in the slot', () => {
    const store = createTestStore();
    const [navId, heroId] = pageBlockIds(store);
    const pageId = homePageId(store);
    store.dispatch(blockShared({ blockId: heroId, slot: 'header', pageId }));
    store.dispatch(blockShared({ blockId: navId, slot: 'footer', pageId }));
    expect(store.getState().project.sharedSlots).toEqual({ header: [], footer: [] });
  });

  it('turns the slot back on for the page it is shared from', () => {
    const store = createTestStore();
    const pageId = homePageId(store);
    store.dispatch(pageSharedSlotShown({ pageId, slot: 'header', isShown: false }));
    shareNavAndFooter(store);
    expect(homePage(store.getState().project).showSharedHeader).toBe(true);
  });

  it('is one undo step', () => {
    const store = createTestStore();
    const [navId] = pageBlockIds(store);
    store.dispatch(blockShared({ blockId: navId, slot: 'header', pageId: homePageId(store) }));
    store.dispatch(undo());
    expect(pageBlockIds(store)[0]).toBe(navId);
    expect(store.getState().project.sharedSlots.header).toEqual([]);
  });
});

describe('blockUnshared', () => {
  it('puts a header block at the top of the page and a footer block at the end', () => {
    const store = createTestStore();
    const { navId, footerId } = shareNavAndFooter(store);
    const pageId = homePageId(store);
    store.dispatch(blockUnshared({ blockId: navId, pageId }));
    store.dispatch(blockUnshared({ blockId: footerId, pageId }));
    expect(componentIds(store)).toEqual([
      'nav-simple',
      'hero-centered',
      'features-grid-3',
      'footer-simple',
    ]);
    expect(store.getState().project.sharedSlots).toEqual({ header: [], footer: [] });
  });
});

describe('shared block edits', () => {
  it('move, duplicate and remove blocks inside their slot', () => {
    const store = createTestStore();
    const { navId } = shareNavAndFooter(store);
    store.dispatch(blockDuplicated(navId));
    const [, copyId] = store.getState().project.sharedSlots.header;
    store.dispatch(blockMoved({ blockId: copyId, toIndex: 0 }));
    expect(store.getState().project.sharedSlots.header).toEqual([copyId, navId]);
    store.dispatch(blockRemoved({ blockId: navId }));
    expect(store.getState().project.sharedSlots.header).toEqual([copyId]);
    expect(store.getState().project.blocks.entities[navId]).toBeUndefined();
    expect(componentIds(store)).toEqual(['hero-centered', 'features-grid-3']);
  });
});

describe('pageSharedSlotShown', () => {
  it('hides a shared slot on one page and clears a selection inside it', () => {
    const store = createTestStore();
    const { navId } = shareNavAndFooter(store);
    store.dispatch(pageAdded({ id: 'about', name: 'About', slug: 'about' }));
    store.dispatch(pageOpened({ pageId: 'about', fromPageId: homePageId(store) }));
    store.dispatch(blockSelected(navId));
    expect(store.getState().editor.selectedBlockId).toBe(navId);
    store.dispatch(pageSharedSlotShown({ pageId: 'about', slot: 'header', isShown: false }));
    expect(store.getState().project.pages.entities.about?.showSharedHeader).toBe(false);
    expect(homePage(store.getState().project).showSharedHeader).toBe(true);
    expect(store.getState().editor.selectedBlockId).toBeNull();
  });
});
