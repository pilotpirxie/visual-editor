import { describe, expect, it } from 'vitest';
import { createSampleProject } from './projectFactory';
import { quoteCardDefinition } from '../test/packFixtures';
import {
  componentBlockOf,
  createTestStore,
  homePage,
  shareNavAndFooter,
  withSystemFonts,
  type TestStore,
} from '../test/fixtures';
import { blockSelected, pageOpened } from './editorSlice';
import { redo, undo } from './history';
import {
  blockAdvancedSet,
  blockDisabledSet,
  blockDuplicated,
  blockInserted,
  blockMoved,
  blockOverrideRemoved,
  blockOverrideSet,
  blockPasted,
  blockRemoved,
  blockShared,
  blockUnshared,
  blockValueSet,
  fontSet,
  iconSetChanged,
  pageAdded,
  pageSharedSlotShown,
  pageNoindexSet,
  siteIndexingSet,
  customBlocksUpgraded,
  tokenSet,
  tokensSet,
} from './projectSlice';

function pageBlockIds(store: TestStore): string[] {
  return homePage(store.getState().project).blockIds;
}

function componentIds(store: TestStore): string[] {
  const { project } = store.getState();
  const ids: string[] = [];
  for (const blockId of pageBlockIds(store))
    ids.push(componentBlockOf(project, blockId).componentId);
  return ids;
}

function homePageId(store: TestStore): string {
  return store.getState().project.pages.homePageId;
}

describe('blockInserted', () => {
  it('inserts a block with its default values at the given index and selects it', () => {
    const store = createTestStore();
    store.dispatch(blockInserted(homePageId(store), 2, 'cta-centered'));
    const inserted = componentBlockOf(store.getState().project, pageBlockIds(store)[2] ?? '');
    expect(componentIds(store)[2]).toBe('cta-centered');
    expect(inserted.values.title).toBe('Your next customer call could be your best roadmap input');
    expect(store.getState().editor.selectedBlockId).toBe(inserted.id);
  });

  it('gives each new modal its own anchor so links can open it', () => {
    const store = createTestStore();
    store.dispatch(blockInserted(homePageId(store), 0, 'modal-simple'));
    store.dispatch(blockInserted(homePageId(store), 0, 'modal-form'));
    const [second, first] = pageBlockIds(store);
    const { project } = store.getState();
    expect(project.blocks.entities[first ?? '']?.anchor).toBe('modal');
    expect(project.blocks.entities[second ?? '']?.anchor).toBe('modal-2');
    store.dispatch(blockInserted(homePageId(store), 0, 'cta-centered'));
    expect(store.getState().project.blocks.entities[pageBlockIds(store)[0] ?? '']?.anchor).toBe(
      undefined,
    );
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
    const { project } = store.getState();
    expect(copyId).not.toBe(source);
    expect(componentBlockOf(project, copyId).values).toEqual(
      componentBlockOf(project, source).values,
    );
    expect(componentBlockOf(project, copyId).values.items).not.toBe(
      componentBlockOf(project, source).values.items,
    );
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
    expect(componentBlockOf(store.getState().project, blockId).values.title).toBe(
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
  return componentBlockOf(store.getState().project, pageBlockIds(store)[1]).overrides;
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
  const LORA_WEIGHTS = [400, 500, 600, 700];

  it('sets the font of a role and its token in one undo step', () => {
    const store = createTestStore(withSystemFonts(createSampleProject()));
    store.dispatch(
      fontSet({
        role: 'heading',
        family: 'Lora',
        availableWeights: LORA_WEIGHTS,
        stack: '"Lora", ui-serif, Georgia, serif',
      }),
    );
    const { fonts, tokens } = store.getState().project.designSystem;
    expect(fonts).toEqual([{ role: 'heading', family: 'Lora', weights: [700] }]);
    expect(tokens['--font-heading'].value).toBe('"Lora", ui-serif, Georgia, serif');
    expect(store.getState().history.past).toHaveLength(1);
  });

  it('moves the heading weight to one the new font offers', () => {
    const store = createTestStore(withSystemFonts(createSampleProject()));
    store.dispatch(
      fontSet({
        role: 'heading',
        family: 'DM Serif Display',
        availableWeights: [400],
        stack: '"DM Serif Display", serif',
      }),
    );
    const { fonts, tokens } = store.getState().project.designSystem;
    expect(tokens['--font-weight-heading'].value).toBe('400');
    expect(fonts).toEqual([{ role: 'heading', family: 'DM Serif Display', weights: [400] }]);
  });

  it('moves both body weights to the closest ones the new font offers', () => {
    const store = createTestStore(withSystemFonts(createSampleProject()));
    store.dispatch(
      fontSet({ role: 'body', family: 'Mono Two', availableWeights: [300, 500], stack: 'serif' }),
    );
    const { fonts, tokens } = store.getState().project.designSystem;
    expect(tokens['--font-weight-regular'].value).toBe('300');
    expect(tokens['--font-weight-bold'].value).toBe('500');
    expect(fonts).toEqual([{ role: 'body', family: 'Mono Two', weights: [300, 500] }]);
  });

  it('replaces the font of the same role and goes back to a system font', () => {
    const store = createTestStore(withSystemFonts(createSampleProject()));
    store.dispatch(
      fontSet({ role: 'body', family: 'Lora', availableWeights: LORA_WEIGHTS, stack: 'serif' }),
    );
    store.dispatch(fontSet({ role: 'body', family: null, stack: 'system-ui, sans-serif' }));
    const { fonts, tokens } = store.getState().project.designSystem;
    expect(fonts).toEqual([]);
    expect(tokens['--font-body'].value).toBe('system-ui, sans-serif');
  });

  it.each([
    ['weights that are not font weights', 'Lora', [450, 0], '"Lora", serif'],
    ['an empty family name', ' ', [400], 'serif'],
    ['an unsafe font stack', 'Lora', [400], 'serif; color: red'],
  ])('ignores %s', (_name, family, availableWeights, stack) => {
    const store = createTestStore(withSystemFonts(createSampleProject()));
    const before = store.getState().project;
    store.dispatch(fontSet({ role: 'body', family, availableWeights, stack }));
    expect(store.getState().project).toBe(before);
  });
});

describe('font weights', () => {
  function storeWithLoraHeadings(): ReturnType<typeof createTestStore> {
    const store = createTestStore(withSystemFonts(createSampleProject()));
    store.dispatch(
      fontSet({
        role: 'heading',
        family: 'Lora',
        availableWeights: [400, 600, 700],
        stack: 'serif',
      }),
    );
    return store;
  }

  it('loads the new weight when a weight token changes', () => {
    const store = storeWithLoraHeadings();
    store.dispatch(tokenSet({ name: '--font-weight-heading', value: '600' }, 'discrete'));
    expect(store.getState().project.designSystem.fonts).toEqual([
      { role: 'heading', family: 'Lora', weights: [600] },
    ]);
  });

  it('keeps the loaded fonts as they are when another token changes', () => {
    const store = storeWithLoraHeadings();
    const fonts = store.getState().project.designSystem.fonts;
    store.dispatch(tokenSet({ name: '--color-primary', value: '#0f766e' }, 'discrete'));
    expect(store.getState().project.designSystem.fonts).toBe(fonts);
  });
});

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

describe('blockPasted', () => {
  function pastedCopy(store: TestStore, blockId: string, newId: string) {
    return { ...store.getState().project.blocks.entities[blockId], id: newId };
  }

  it('adds a ready-made block to the page at the index and selects it, in one undo step', () => {
    const store = createTestStore();
    const heroId = pageBlockIds(store)[1];
    const block = pastedCopy(store, heroId, 'pasted');
    store.dispatch(
      blockPasted({ target: { kind: 'page', pageId: homePageId(store) }, index: 2, block }),
    );
    expect(pageBlockIds(store)[2]).toBe('pasted');
    expect(store.getState().editor.selectedBlockId).toBe('pasted');
    store.dispatch(undo());
    expect(pageBlockIds(store)).not.toContain('pasted');
  });

  it('adds a navigation to the shared header but refuses other blocks there', () => {
    const store = createTestStore();
    const [navId, heroId] = pageBlockIds(store);
    const header = { kind: 'slot' as const, slot: 'header' as const };
    store.dispatch(
      blockPasted({ target: header, index: 0, block: pastedCopy(store, navId, 'nav-2') }),
    );
    store.dispatch(
      blockPasted({ target: header, index: 0, block: pastedCopy(store, heroId, 'hero-2') }),
    );
    expect(store.getState().project.sharedSlots.header).toEqual(['nav-2']);
    expect(store.getState().project.blocks.entities['hero-2']).toBeUndefined();
  });

  it('refuses a block whose id is already used', () => {
    const store = createTestStore();
    const heroId = pageBlockIds(store)[1];
    const block = pastedCopy(store, heroId, heroId);
    store.dispatch(
      blockPasted({ target: { kind: 'page', pageId: homePageId(store) }, index: 0, block }),
    );
    expect(pageBlockIds(store)).toHaveLength(4);
    expect(store.getState().history.past).toHaveLength(0);
  });
});

describe('iconSetChanged', () => {
  it('switches the default icon set in one undo step and refuses brand-only sets', () => {
    const store = createTestStore();
    store.dispatch(iconSetChanged('phosphor'));
    expect(store.getState().project.designSystem.iconSet).toBe('phosphor');
    store.dispatch(iconSetChanged('simple-icons'));
    store.dispatch(iconSetChanged('made-up'));
    expect(store.getState().project.designSystem.iconSet).toBe('phosphor');
    store.dispatch(undo());
    expect(store.getState().project.designSystem.iconSet).toBe('lucide');
  });
});

describe('search engine indexing', () => {
  it('hides a page from search engines and lets the whole site be indexed or not, undoably', () => {
    const store = createTestStore();
    const pageId = store.getState().project.pages.homePageId;
    store.dispatch(pageNoindexSet({ pageId, noindex: true }));
    store.dispatch(siteIndexingSet(false));
    const { project } = store.getState();
    expect(project.pages.entities[pageId]?.seo.noindex).toBe(true);
    expect(project.settings.indexable).toBe(false);
    store.dispatch(undo());
    expect(store.getState().project.settings.indexable).toBe(true);
  });
});

describe('custom blocks', () => {
  it('embeds the definition with the first inserted block, in the same undo step', () => {
    const store = createTestStore();
    const custom = quoteCardDefinition();
    store.dispatch(blockInserted(homePageId(store), 0, custom.definition.id, custom));
    const inserted = componentBlockOf(store.getState().project, pageBlockIds(store)[0] ?? '');
    expect(inserted.componentId).toBe('acme/quote-card');
    expect(inserted.values.quote).toBe('It changed how our team works.');
    expect(store.getState().project.customDefinitions['acme/quote-card']).toEqual(custom);
    store.dispatch(undo());
    expect(store.getState().project.customDefinitions).toEqual({});
    store.dispatch(redo());
    expect(store.getState().project.customDefinitions['acme/quote-card']).toEqual(custom);
  });

  it('keeps the project copy when the block is inserted again', () => {
    const store = createTestStore();
    const custom = quoteCardDefinition();
    store.dispatch(blockInserted(homePageId(store), 0, custom.definition.id, custom));
    const other = quoteCardDefinition({ name: 'Renamed' });
    store.dispatch(blockInserted(homePageId(store), 0, other.definition.id, other));
    expect(store.getState().project.customDefinitions['acme/quote-card']?.definition.name).toBe(
      'Quote card',
    );
  });

  it('upgrades definitions and blocks together in one undo step', () => {
    const store = createTestStore();
    const custom = quoteCardDefinition();
    store.dispatch(blockInserted(homePageId(store), 0, custom.definition.id, custom));
    const block = componentBlockOf(store.getState().project, pageBlockIds(store)[0] ?? '');
    const newer = quoteCardDefinition({ version: 2 }, '1.1.0');
    store.dispatch(
      customBlocksUpgraded({
        definitions: { [newer.definition.id]: newer },
        blocks: [{ ...block, componentVersion: 2 }],
      }),
    );
    expect(store.getState().project.customDefinitions['acme/quote-card']?.pack.version).toBe(
      '1.1.0',
    );
    store.dispatch(undo());
    expect(store.getState().project.customDefinitions['acme/quote-card']?.pack.version).toBe(
      '1.0.0',
    );
    expect(componentBlockOf(store.getState().project, block.id).componentVersion).toBe(1);
  });
});
