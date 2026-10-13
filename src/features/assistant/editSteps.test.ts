import { describe, expect, it } from 'vitest';
import { builtInComponents } from '../../components/registry';
import type { ComponentDefinition } from '../../components/types';
import {
  addableCategories,
  decideRequest,
  MAX_EDITS,
  MAX_NEW_PAGES,
  parseDecision,
  parsePicks,
  pickRequest,
  writeRequest,
  type SectionAdd,
} from './editSteps';

const OUTLINE = 'Page "Home" (slug "home"):\n  [s1] Hero (headers): "Fresh bread daily"';

const PRICING: SectionAdd = {
  page: 'home',
  after: 's1',
  category: 'pricing',
  theme: 'surface',
  note: 'Three plans for cake orders',
};

function definitionOf(blockId: string): ComponentDefinition {
  const component = builtInComponents.get(blockId);
  if (component === undefined) throw new Error(`The library has no block ${blockId}`);
  return component.definition;
}

describe('addableCategories', () => {
  it('leaves out the categories that live in shared slots or outside pages', () => {
    const categories = addableCategories();
    expect(categories).toContain('headers');
    expect(categories).toContain('pricing');
    expect(categories).not.toContain('navigations');
    expect(categories).not.toContain('footers');
    expect(categories).not.toContain('modals');
    expect(categories).not.toContain('cookies');
  });
});

describe('decideRequest', () => {
  it('sends the outline, the request and a strict schema', () => {
    const request = decideRequest(OUTLINE, 'Make the headline shorter', []);
    expect(request.user).toContain(OUTLINE);
    expect(request.user).toContain('"""Make the headline shorter"""');
    expect(request.user).not.toContain('Earlier in this conversation');
    expect(request.schema?.name).toBe('site_changes');
    expect(request.system).toContain('exactly one JSON object');
  });

  it('adds the earlier requests and answers, oldest first', () => {
    const earlier = [
      { request: 'Add a pricing section', reply: 'I added three plans.' },
      { request: 'Make it darker', reply: 'The page is dark now.' },
    ];
    const { user } = decideRequest(OUTLINE, 'Undo the dark look', earlier);
    const first = user.indexOf('They asked: Add a pricing section');
    const second = user.indexOf('They asked: Make it darker');
    expect(first).toBeGreaterThan(-1);
    expect(second).toBeGreaterThan(first);
    expect(user).toContain('You answered: The page is dark now.');
  });
});

describe('parseDecision', () => {
  it('reads every kind of change', () => {
    const decision = parseDecision({
      reply: ' Done, the headline is shorter. ',
      edits: [{ section: 's1', instruction: 'Shorten the title' }],
      adds: [{ page: 'home', after: 's1', category: 'pricing', theme: 'dark', note: 'Plans' }],
      removes: ['s2', 's2', ''],
      moves: [{ section: 's3', after: '' }],
      themes: [{ section: 's1', theme: 'primary' }],
      pages: [{ name: 'Prices', slug: 'prices' }],
      tokens: [{ name: '--color-primary', value: '#00aa55' }],
      headingFont: 'Fraunces',
      bodyFont: '',
      title: 'Crumb',
      description: '',
    });
    expect(decision).toEqual({
      reply: 'Done, the headline is shorter.',
      edits: [{ ref: 's1', instruction: 'Shorten the title' }],
      adds: [{ page: 'home', after: 's1', category: 'pricing', theme: 'dark', note: 'Plans' }],
      removes: ['s2'],
      moves: [{ ref: 's3', after: '' }],
      themes: [{ ref: 's1', theme: 'primary' }],
      pages: [{ name: 'Prices', slug: 'prices' }],
      tokens: { '--color-primary': '#00aa55' },
      headingFont: 'Fraunces',
      bodyFont: '',
      title: 'Crumb',
      description: '',
    });
  });

  it('turns an answer of the wrong shape into no changes', () => {
    for (const answer of [null, 'text', [], { edits: 'all', adds: {}, tokens: [1, null] }]) {
      const decision = parseDecision(answer);
      expect(decision.edits).toEqual([]);
      expect(decision.adds).toEqual([]);
      expect(decision.removes).toEqual([]);
      expect(decision.tokens).toEqual({});
      expect(decision.reply).toBe('');
    }
  });

  it('drops entries it cannot use and keeps to the limits', () => {
    const edits: unknown[] = [{ section: '', instruction: 'x' }, { section: 's1' }];
    for (let index = 0; index < MAX_EDITS + 5; index += 1) {
      edits.push({ section: `s${index}`, instruction: 'Rewrite' });
    }
    const decision = parseDecision({
      edits,
      adds: [
        { page: 'home', after: '', category: 'navigations', theme: 'default', note: '' },
        { page: '', after: '', category: 'pricing', theme: 'default', note: '' },
        { page: 'home', after: '', category: 'faq', theme: 'neon', note: 'Questions' },
      ],
      themes: [{ section: 's1', theme: 'neon' }],
      pages: [{ name: '' }, { name: 'A' }, { name: 'B' }, { name: 'C' }, { name: 'D' }],
    });
    expect(decision.edits.length).toBeLessThanOrEqual(MAX_EDITS);
    expect(decision.edits[0]).toEqual({ ref: 's0', instruction: 'Rewrite' });
    expect(decision.adds).toEqual([
      { page: 'home', after: '', category: 'faq', theme: 'default', note: 'Questions' },
    ]);
    expect(decision.themes).toEqual([]);
    expect(decision.pages.length).toBeLessThanOrEqual(MAX_NEW_PAGES);
    expect(decision.pages[0]).toEqual({ name: 'A', slug: '' });
  });
});

describe('pickRequest', () => {
  it('lists the new sections and only the blocks of their categories', () => {
    const { user, schema } = pickRequest([PRICING, { ...PRICING, note: 'A second table' }]);
    expect(user).toContain('1. Category "pricing": Three plans for cake orders');
    expect(user).toContain('2. Category "pricing": A second table');
    expect(user).toContain('exactly 2 ids');
    expect(user).toContain('(category "pricing")');
    expect(user).not.toContain('(category "headers")');
    expect(schema?.name).toBe('section_blocks');
  });
});

describe('parsePicks', () => {
  it('keeps picked page blocks and falls back to a block of the category', () => {
    const adds = [PRICING, PRICING, PRICING, PRICING];
    const picked = parsePicks({ blocks: ['features-grid-3', 'nav-simple', 'no-such-block'] }, adds);
    expect(picked.map((definition) => definition?.category)).toEqual([
      'features',
      'pricing',
      'pricing',
      'pricing',
    ]);
  });

  it('falls back for every section when the answer has no list', () => {
    const picked = parsePicks(null, [PRICING]);
    expect(picked[0]?.category).toBe('pricing');
  });
});

describe('writeRequest', () => {
  it('sends new sections with examples and existing ones with their content', () => {
    const hero = definitionOf('hero-image');
    const site = {
      title: 'Crumb',
      description: 'A bakery in Leeds.',
      pages: [
        { name: 'Home', slug: 'home' },
        { name: 'Prices', slug: 'prices' },
      ],
    };
    const { user, schema } = writeRequest(site, [
      { definition: hero, note: 'Welcome people', current: null },
      { definition: hero, note: 'Shorten the title', current: { title: 'A long title' } },
    ]);
    expect(schema).toBeNull();
    expect(user).toContain('Site name: Crumb');
    expect(user).toContain('- Prices ("prices")');
    expect(user).toContain('"home" (Home), "prices" (Prices)');
    expect(user).toContain('exactly 2 entries');
    const sections: unknown = JSON.parse(user.slice(user.indexOf('Sections:\n') + 10));
    expect(sections).toMatchObject([
      { block: 'hero-image', note: 'Welcome people' },
      { block: 'hero-image', note: 'Shorten the title', current: { title: 'A long title' } },
    ]);
    expect(JSON.stringify(sections)).toContain('"example"');
    const [, existing] = Array.isArray(sections) ? sections : [];
    expect(JSON.stringify(existing)).not.toContain('"example"');
  });
});
