import { beforeAll, describe, expect, it, vi } from 'vitest';
import type { Block, ComponentBlock, Project } from '../../app/types';
import { validateField } from '../../components/fields';
import { forEachFieldValue } from '../../components/fieldValues';
import { builtInComponents } from '../../components/registry';
import { parseProjectDocument } from '../../persistence/validateProject';
import { CLEAN_PRESET, withoutPresetId } from '../../presets/presets';
import { renderStandalonePage } from '../../render/exportSite';
import { ensureProjectIconSets } from '../icons/ensureIconSets';
import {
  buildSiteProject,
  knownAddress,
  safeCustomHtml,
  withKnownMapAddresses,
  withRenderableBlocks,
  type SiteWriting,
} from './buildSite';
import { parseSitePlan, type SitePlan } from './siteSteps';

const design = withoutPresetId(structuredClone(CLEAN_PRESET.designSystem));

const PLAN: SitePlan = parseSitePlan({
  title: 'Crumb & Co',
  description: 'A neighbourhood bakery in Leeds.',
  language: 'en-GB',
  header: 'nav-simple',
  footer: 'footer-simple',
  pages: [
    {
      name: 'Home',
      slug: 'home',
      purpose: 'Introduce the bakery',
      sections: [
        { block: 'hero-centered', custom: '', theme: 'default', note: '' },
        { block: 'features-grid-3', custom: '', theme: 'dark', note: '' },
        { block: '', custom: 'Opening hours table', theme: 'default', note: '' },
        { block: '', custom: 'A second custom section', theme: 'default', note: '' },
      ],
    },
    {
      name: 'Menu',
      slug: 'menu',
      purpose: 'What we bake',
      sections: [{ block: 'hero-app', custom: '', theme: 'surface', note: '' }],
    },
  ],
});

const HOURS_HTML = [
  '<section class="section" onclick="steal()"><div class="container stack">',
  '<h2>Opening hours</h2><script>alert(1)</script><style>p{color:red}</style>',
  '<img src="https://example.com/track.gif" alt="">',
  '<p style="background: url(https://example.com/a.png)">Mon to Sat, 7 to 4</p>',
  '<p style="padding: var(--space-4)">Closed on Sunday</p>',
  '<form action="https://example.com"><input name="email"></form>',
  '<a href="menu.html">See the menu</a><a href="javascript:alert(1)">Bad</a>',
  '</div></section>',
].join('');

const WRITING: SiteWriting = {
  shared: [
    {
      kind: 'values',
      values: {
        links: [
          { label: 'Menu', link: { type: 'page', pageId: 'menu' } },
          { label: 'Lost', link: { type: 'page', pageId: 'gone' } },
        ],
      },
    },
    { kind: 'values', values: undefined },
  ],
  pages: {
    home: [
      {
        kind: 'values',
        values: {
          title: 'Bread worth getting up for',
          primaryButton: { label: 'See the menu', link: { type: 'page', pageId: 'menu' } },
        },
      },
      { kind: 'values', values: { title: 'Why people queue', items: 'not a list' } },
      { kind: 'html', html: HOURS_HTML },
      { kind: 'html', html: '<img src="x.png" alt="">   ' },
    ],
    menu: null,
  },
};

let project: Project;

function pageBlocks(slug: string): Block[] {
  const page = Object.values(project.pages.entities).find((entry) => entry.slug === slug);
  if (page === undefined) throw new Error(`The site has no page ${slug}`);
  return page.blockIds.map((id) => project.blocks.entities[id]);
}

function componentAt(slug: string, index: number): ComponentBlock {
  const block = pageBlocks(slug)[index];
  if (block.kind !== 'component') throw new Error(`Block ${index} of ${slug} is not a component`);
  return block;
}

function pageIdOf(slug: string): string {
  const page = Object.values(project.pages.entities).find((entry) => entry.slug === slug);
  return page?.id ?? '';
}

function linkedPageIds(value: unknown): string[] {
  if (typeof value !== 'object' || value === null) return [];
  if ('link' in value) return linkedPageIds(value.link);
  if ('pageId' in value && typeof value.pageId === 'string') return [value.pageId];
  return [];
}

beforeAll(async () => {
  project = buildSiteProject(PLAN, design, WRITING);
  await ensureProjectIconSets(project);
});

describe('buildSiteProject', () => {
  it('makes a project a project file accepts', () => {
    const saved: unknown = JSON.parse(JSON.stringify(project));
    expect(parseProjectDocument(saved)).toEqual(project);
    expect(project.settings).toMatchObject({
      title: 'Crumb & Co',
      description: 'A neighbourhood bakery in Leeds.',
      language: 'en-GB',
    });
    expect(project.designSystem).toEqual(design);
  });

  it('creates the pages in order with fresh ids and the first as home', () => {
    const pages = project.pages.ids.map((id) => project.pages.entities[id]);
    expect(pages.map(({ name, slug }) => [name, slug])).toEqual([
      ['Home', 'home'],
      ['Menu', 'menu'],
    ]);
    expect(project.pages.homePageId).toBe(pages[0].id);
    expect(project.pages.ids).not.toContain('home');
  });

  it('puts the navigation and footer in the shared slots', () => {
    const header = project.blocks.entities[project.sharedSlots.header[0]];
    const footer = project.blocks.entities[project.sharedSlots.footer[0]];
    expect(header).toMatchObject({ kind: 'component', componentId: 'nav-simple' });
    expect(footer).toMatchObject({ kind: 'component', componentId: 'footer-simple' });
    expect(project.sharedSlots.header).toHaveLength(1);
    expect(project.sharedSlots.footer).toHaveLength(1);
  });

  it('uses the written text and the defaults for what was not written', () => {
    const hero = componentAt('home', 0);
    expect(hero.componentId).toBe('hero-centered');
    expect(hero.values.title).toBe('Bread worth getting up for');
    const features = componentAt('home', 1);
    expect(features.values.title).toBe('Why people queue');
    expect(features.values.items).toEqual(
      builtInComponents
        .get('features-grid-3')
        ?.definition.fields.find(({ name }) => name === 'items')?.default,
    );
    const menuHero = componentAt('menu', 0);
    const defaults = builtInComponents.get('hero-app')?.definition.fields ?? [];
    for (const field of defaults) expect(menuHero.values[field.name]).toEqual(field.default);
  });

  it('gives every block valid values and links to pages that exist', () => {
    for (const block of Object.values(project.blocks.entities)) {
      if (block.kind !== 'component') continue;
      const fields = builtInComponents.get(block.componentId)?.definition.fields ?? [];
      forEachFieldValue(fields, block.values, (field, value) => {
        expect(validateField(field, value), `${block.componentId}.${field.name}`).toBeNull();
        for (const pageId of linkedPageIds(value)) {
          expect(project.pages.entities[pageId], `${block.componentId} → ${pageId}`).toBeDefined();
        }
      });
    }
    const nav = project.blocks.entities[project.sharedSlots.header[0]];
    expect(nav).toHaveProperty('values.links.0.link.pageId', pageIdOf('menu'));
    expect(nav).toHaveProperty('values.links.1.link.pageId', pageIdOf('home'));
    expect(componentAt('home', 0)).toHaveProperty(
      'values.primaryButton.link.pageId',
      pageIdOf('menu'),
    );
  });

  it('applies section themes', () => {
    expect(componentAt('home', 0).overrides).toEqual({});
    expect(componentAt('home', 1).overrides).toMatchObject({
      '--color-background': 'var(--theme-dark-background)',
      '--color-text': 'var(--theme-dark-text)',
    });
    expect(componentAt('menu', 0).overrides).toEqual({
      '--color-background': 'var(--color-surface)',
    });
  });

  it('keeps safe custom markup and skips an empty custom section', () => {
    const blocks = pageBlocks('home');
    expect(blocks).toHaveLength(3);
    const custom = blocks[2];
    expect(custom.kind).toBe('html');
    if (custom.kind !== 'html') return;
    expect(custom.html).toContain('<h2>Opening hours</h2>');
    expect(custom.html).toContain('Closed on Sunday');
    expect(custom.html).toContain('style="padding: var(--space-4)"');
    expect(custom.html).toContain('href="menu.html"');
    for (const unsafe of ['script', 'style>', 'onclick', '<img', '<form', '<input', 'url(']) {
      expect(custom.html, unsafe).not.toContain(unsafe);
    }
    expect(custom.html).not.toContain('javascript:');
    expect(custom.html).not.toContain('example.com');
  });

  it('renders every page', () => {
    for (const pageId of project.pages.ids) {
      const html = renderStandalonePage(project, pageId, builtInComponents, {
        shouldLinkFonts: false,
      });
      expect(html).toContain('b-nav-simple');
      expect(html).toContain('b-footer-simple');
    }
    const home = renderStandalonePage(project, project.pages.homePageId, builtInComponents, {
      shouldLinkFonts: false,
    });
    expect(home).toContain('Bread worth getting up for');
    expect(home).toContain('href="menu.html"');
  });

  it('builds from a plan with nothing written at all', () => {
    const bare = buildSiteProject({ ...PLAN, title: '' }, design, { shared: null, pages: {} });
    expect(bare.settings.title).toBe('Untitled site');
    expect(bare.blocks.ids).toHaveLength(5);
  });
});

describe('withRenderableBlocks', () => {
  it('resets a block whose values break its template', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const heroId = pageBlocks('home')[0].id;
    const hero = project.blocks.entities[heroId];
    if (hero.kind !== 'component') throw new Error('The first block should be the hero');
    const explosive = new Proxy(hero.values, {
      get() {
        throw new Error('This value cannot be read');
      },
    });
    const broken: Project = {
      ...project,
      blocks: {
        ids: project.blocks.ids,
        entities: { ...project.blocks.entities, [heroId]: { ...hero, values: explosive } },
      },
    };
    const repaired = withRenderableBlocks(broken).blocks.entities[heroId];
    const defaults = builtInComponents.get('hero-centered')?.definition.fields ?? [];
    for (const field of defaults)
      expect(repaired).toHaveProperty(['values', field.name], field.default);
    expect(withRenderableBlocks(project)).toEqual(project);
    vi.restoreAllMocks();
  });
});

describe('safeCustomHtml', () => {
  it('returns nothing for markup without text', () => {
    expect(safeCustomHtml('<section class="section"><img src="a.png"></section>')).toBe('');
    expect(safeCustomHtml('<script>alert(1)</script>')).toBe('');
    expect(safeCustomHtml('')).toBe('');
  });

  it('keeps tables, classes and token styles', () => {
    const html =
      '<section class="section"><table><tr><td style="color: var(--color-primary)">9 to 5</td></tr></table></section>';
    expect(safeCustomHtml(html)).toBe(
      html.replace('<tr>', '<tbody><tr>').replace('</tr>', '</tr></tbody>'),
    );
  });
});

describe('knownAddress', () => {
  const brief = 'Studio Marta, a hairdresser at 14 Call Lane, Leeds LS1 6DN. Warm and friendly.';

  it('keeps an address the person gave', () => {
    expect(knownAddress('14 Call Lane\nLeeds LS1 6DN', brief)).toBe('14 Call Lane, Leeds LS1 6DN');
  });

  it('drops an invented street and keeps the town the person named', () => {
    expect(knownAddress('12 Vicar Lane\nLeeds LS1 7JH', 'A hairdresser in Leeds.')).toBe('Leeds');
    expect(knownAddress('220 King Street West\nToronto, ON', 'A hairdresser in Leeds.')).toBe('');
  });

  it('keeps the parts that were given and leaves out the rest', () => {
    expect(knownAddress('Studio Marta\nCity centre, Leeds\nWest Yorkshire', brief)).toBe(
      'Studio Marta, Leeds',
    );
  });
});

describe('withKnownMapAddresses', () => {
  it('changes only the address of live map blocks', () => {
    const plan = parseSitePlan({
      title: 'Studio Marta',
      pages: [
        {
          name: 'Home',
          sections: [
            { block: 'hero-local', custom: '', theme: 'default', note: '' },
            { block: 'contact-location', custom: '', theme: 'default', note: '' },
          ],
        },
      ],
    });
    const address = '12 Vicar Lane\nLeeds LS1 7JH';
    const built = buildSiteProject(plan, design, {
      shared: null,
      pages: {
        home: [
          { kind: 'values', values: { address } },
          { kind: 'values', values: { address } },
        ],
      },
    });
    const checked = withKnownMapAddresses(built, 'A hairdresser in Leeds.');
    const addresses: Record<string, unknown> = {};
    for (const block of Object.values(checked.blocks.entities)) {
      if (block.kind === 'component') addresses[block.componentId] = block.values.address;
    }
    expect(addresses['contact-location']).toBe('Leeds');
    expect(addresses['hero-local']).toBe(address);
    const saved: unknown = JSON.parse(JSON.stringify(checked));
    expect(() => parseProjectDocument(saved)).not.toThrow();
  });
});
