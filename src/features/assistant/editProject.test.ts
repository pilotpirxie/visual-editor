import { beforeEach, describe, expect, it } from 'vitest';
import { createSampleProject } from '../../app/projectFactory';
import { blockShared, projectSlice } from '../../app/projectSlice';
import type { Block, HtmlBlock, Project } from '../../app/types';
import { builtInComponents, createBlock } from '../../components/registry';
import type { UploadedImageValue } from '../../components/types';
import { componentBlockOf, homePage } from '../../test/fixtures';
import {
  applyProjectEdit,
  editOutline,
  planProjectEdit,
  type EditInput,
  type ProjectChange,
} from './editProject';
import type { Ask } from './generateSite';
import type { JsonAnswer } from './openRouter';
import type { StepRequest } from './siteSteps';

type Step = 'decide' | 'pick' | 'write';

const USAGE = { tokens: 10, cost: 0.001 };

const PHOTO: UploadedImageValue = {
  source: 'upload',
  src: 'data:image/png;base64,iVBORw0KGgo=',
  name: 'oven.png',
  alt: 'Bread coming out of the oven',
  decorative: false,
  width: 640,
  height: 480,
};

const CUSTOM: HtmlBlock = {
  id: 'custom-html',
  kind: 'html',
  html: '<section class="section"><h2>Hand written</h2></section>',
  disabled: false,
  extraClasses: [],
  hideOn: [],
};

let project: Project;
let navId: string;
let heroId: string;
let featuresId: string;
let footerId: string;
let photoHeroId: string;
let asked: { step: Step; request: StepRequest }[];
let answers: Partial<Record<Step, unknown>>;

function stepOf(request: StepRequest): Step {
  if (request.schema?.name === 'site_changes') return 'decide';
  if (request.schema?.name === 'section_blocks') return 'pick';
  return 'write';
}

const ask: Ask = async (request) => {
  const step = stepOf(request);
  asked.push({ step, request });
  const answer: JsonAnswer = { value: answers[step] ?? {}, usage: USAGE };
  return answer;
};

function input(request = 'Change it'): EditInput {
  return {
    project,
    openPageId: project.pages.homePageId,
    selectedBlockId: heroId,
    request,
    earlier: [],
  };
}

function plan(decision: Record<string, unknown>, sections: unknown[] = []): Promise<unknown> {
  answers.decide = decision;
  answers.write = { sections };
  return planProjectEdit(ask, input(), new AbortController().signal);
}

async function changesFor(
  decision: Record<string, unknown>,
  sections: unknown[] = [],
): Promise<ProjectChange[]> {
  answers.decide = decision;
  answers.write = { sections };
  const edit = await planProjectEdit(ask, input(), new AbortController().signal);
  return edit.changes;
}

function writtenTasks(): Record<string, unknown>[] {
  const write = asked.find(({ step }) => step === 'write');
  if (write === undefined) throw new Error('Nothing was written');
  const { user } = write.request;
  return JSON.parse(user.slice(user.indexOf('Sections:\n') + 'Sections:\n'.length));
}

function navLinks(): Record<string, unknown>[] {
  const links = structuredClone(componentBlockOf(project, navId).values.links);
  if (!Array.isArray(links)) throw new Error('The navigation has no links');
  return links;
}

function withBlock(base: Project, block: Block): Project {
  const page = homePage(base);
  return {
    ...base,
    blocks: {
      ids: [...base.blocks.ids, block.id],
      entities: { ...base.blocks.entities, [block.id]: block },
    },
    pages: {
      ...base.pages,
      entities: {
        ...base.pages.entities,
        [page.id]: { ...page, blockIds: [...page.blockIds, block.id] },
      },
    },
  };
}

beforeEach(() => {
  let sample = createSampleProject();
  const page = homePage(sample);
  [navId, heroId, featuresId, footerId] = page.blockIds;
  sample = projectSlice.reducer(
    sample,
    blockShared({ blockId: navId, slot: 'header', pageId: page.id }),
  );
  sample = projectSlice.reducer(
    sample,
    blockShared({ blockId: footerId, slot: 'footer', pageId: page.id }),
  );
  const heroImage = builtInComponents.get('hero-image');
  if (heroImage === undefined) throw new Error('The library has no hero-image block');
  const photoHero = createBlock(heroImage.definition);
  photoHero.values.image = PHOTO;
  photoHeroId = photoHero.id;
  project = withBlock(withBlock(sample, photoHero), CUSTOM);
  asked = [];
  answers = {};
});

describe('editOutline', () => {
  it('numbers every section, shared ones included, and marks what the person looks at', () => {
    const outline = editOutline(project, project.pages.homePageId, heroId);
    expect([...outline.blockIds.entries()]).toEqual([
      ['s1', navId],
      ['s2', heroId],
      ['s3', featuresId],
      ['s4', photoHeroId],
      ['s5', CUSTOM.id],
      ['s6', footerId],
    ]);
    expect(outline.text).toContain('Site name: Fieldnote');
    expect(outline.text).toContain('Page "Home" (slug "home", the page the person has open):');
    expect(outline.text).toContain(
      '[s2] Hero, centered text (headers, theme default, selected): "',
    );
    expect(outline.text).toContain('[s5] Custom HTML section (cannot be edited)');
    expect(outline.text).toContain('--color-primary: ');
    expect(outline.text).toContain('Font for headings: ');
  });

  it('shows the theme of a section and that it is hidden', () => {
    const hero = componentBlockOf(project, heroId);
    const dark = projectSlice.reducer(
      project,
      projectSlice.actions.blockSectionThemeSet({ blockId: heroId, themeId: 'dark' }),
    );
    const hidden = projectSlice.reducer(
      dark,
      projectSlice.actions.blockDisabledSet({ blockId: hero.id, disabled: true }),
    );
    const outline = editOutline(hidden, hidden.pages.homePageId, null);
    expect(outline.text).toContain('[s2] Hero, centered text (headers, theme dark, hidden): "');
  });
});

describe('planProjectEdit', () => {
  it('changes only the fields the model returns for a section', async () => {
    const edit = await plan(
      { reply: 'Shorter now.', edits: [{ section: 's2', instruction: 'Shorten the title' }] },
      [
        {
          values: {
            title: 'Hear every customer',
            eyebrow: componentBlockOf(project, heroId).values.eyebrow,
          },
        },
      ],
    );
    expect(edit).toEqual({
      reply: 'Shorter now.',
      changes: [{ kind: 'values', blockId: heroId, values: { title: 'Hear every customer' } }],
    });
    expect(asked.map(({ step }) => step)).toEqual(['decide', 'write']);
    expect(asked[0].request.user).toContain('"""Change it"""');
    const [task] = writtenTasks();
    expect(task).toMatchObject({ block: 'hero-centered', note: 'Shorten the title' });
    expect(task.current).toMatchObject({ title: componentBlockOf(project, heroId).values.title });
  });

  it('asks nothing more when nothing has to be written', async () => {
    const changes = await changesFor({ reply: 'Which section do you mean?' });
    expect(changes).toEqual([]);
    expect(asked.map(({ step }) => step)).toEqual(['decide']);
  });

  it('ignores values it cannot use and sections it cannot edit', async () => {
    const changes = await changesFor(
      {
        edits: [
          { section: 's2', instruction: 'Break it' },
          { section: 's5', instruction: 'Rewrite the custom section' },
          { section: 's99', instruction: 'No such section' },
        ],
      },
      [{ values: { title: '', showSecondary: 'maybe', unknownField: 'x' } }],
    );
    expect(changes).toEqual([]);
    expect(writtenTasks()).toHaveLength(1);
  });

  it('joins two instructions for the same section into one task', async () => {
    await changesFor({
      edits: [
        { section: 's2', instruction: 'Shorten the title.' },
        { section: 's2', instruction: 'Rename the button.' },
      ],
    });
    expect(writtenTasks()).toHaveLength(1);
    expect(writtenTasks()[0].note).toBe('Shorten the title. Rename the button.');
  });

  it('keeps an uploaded picture that comes back with its id', async () => {
    const changes = await changesFor(
      { edits: [{ section: 's4', instruction: 'Describe the picture better' }] },
      [{ values: { image: { picture: 'p1', alt: 'Warm loaves on a tray' } } }],
    );
    expect(writtenTasks()[0].current).toMatchObject({
      image: { picture: 'p1', alt: PHOTO.alt },
    });
    expect(JSON.stringify(writtenTasks())).not.toContain(PHOTO.src);
    expect(changes).toEqual([
      {
        kind: 'values',
        blockId: photoHeroId,
        values: { image: { ...PHOTO, alt: 'Warm loaves on a tray' } },
      },
    ]);
  });

  it('keeps hand-picked icons and section links in a list that comes back whole', async () => {
    const features = componentBlockOf(project, featuresId);
    const items = structuredClone(features.values.items);
    if (!Array.isArray(items)) throw new Error('The features block has no items');
    items[0].icon = 'remix:star-line';
    project = projectSlice.reducer(
      project,
      projectSlice.actions.blockValueSet(featuresId, 'items', items, 'discrete'),
    );
    const links = navLinks();
    const renamed = structuredClone(links);
    renamed[0].label = 'Start';
    const rewritten = structuredClone(items);
    rewritten[1].title = 'Rewritten';
    rewritten[1].icon = 'not-an-icon';

    const changes = await changesFor(
      {
        edits: [
          { section: 's3', instruction: 'Rename the second feature' },
          { section: 's1', instruction: 'Rename the first link' },
        ],
      },
      [{ values: { items: rewritten } }, { values: { links: renamed } }],
    );
    expect(changes).toHaveLength(2);
    const [featuresChange, navChange] = changes;
    if (featuresChange.kind !== 'values' || navChange.kind !== 'values') {
      throw new Error('Expected two value changes');
    }
    expect(featuresChange.values.items).toMatchObject([
      { icon: 'remix:star-line' },
      { title: 'Rewritten' },
      {},
    ]);
    expect(JSON.stringify(featuresChange.values.items)).not.toContain('not-an-icon');
    expect(navChange.values.links).toEqual(renamed);
    expect(JSON.stringify(navChange.values.links)).toContain('"type":"section"');
  });

  it('adds a section with a picked block, its theme and its place', async () => {
    answers.pick = { blocks: ['pricing-3-plans'] };
    const changes = await changesFor(
      {
        adds: [{ page: 'home', after: 's2', category: 'pricing', theme: 'dark', note: 'Plans' }],
      },
      [{ values: { title: 'Cake plans' } }],
    );
    expect(asked.map(({ step }) => step)).toEqual(['decide', 'pick', 'write']);
    expect(asked[1].request.user).toContain('1. Category "pricing": Plans');
    expect(writtenTasks()[0]).toMatchObject({ block: 'pricing-3-plans', note: 'Plans' });
    expect(writtenTasks()[0].current).toBeUndefined();
    expect(changes).toHaveLength(1);
    const [added] = changes;
    if (added.kind !== 'add' || added.block.kind !== 'component')
      throw new Error('Expected an add');
    expect(added.pageId).toBe(project.pages.homePageId);
    expect(added.afterBlockId).toBe(heroId);
    expect(added.block.componentId).toBe('pricing-3-plans');
    expect(added.block.values.title).toBe('Cake plans');
    expect(Object.keys(added.block.overrides).length).toBeGreaterThan(0);
  });

  it('puts a section with an unknown place at the end of its page', async () => {
    answers.pick = { blocks: ['pricing-3-plans'] };
    const changes = await changesFor({
      adds: [{ page: 'home', after: 's77', category: 'pricing', theme: 'default', note: '' }],
    });
    expect(changes[0]).toMatchObject({ kind: 'add', afterBlockId: CUSTOM.id });
  });

  it('adds a page, fills it and links to it from the navigation', async () => {
    answers.pick = { blocks: ['hero-centered', 'pricing-3-plans'] };
    const links = navLinks();
    links.push({ label: 'Prices', link: { type: 'page', pageId: 'prices' } });
    const changes = await changesFor(
      {
        pages: [{ name: 'Prices', slug: 'prices' }],
        adds: [
          { page: 'prices', after: '', category: 'headers', theme: 'default', note: 'Our prices' },
          { page: 'prices', after: '', category: 'pricing', theme: 'default', note: 'Plans' },
        ],
        edits: [{ section: 's1', instruction: 'Add a link to the Prices page' }],
      },
      [{ values: { title: 'Our prices' } }, { values: {} }, { values: { links } }],
    );
    expect(changes.map(({ kind }) => kind)).toEqual(['page', 'add', 'add', 'values']);
    const [page, hero, , navChange] = changes;
    if (page.kind !== 'page' || hero.kind !== 'add' || navChange.kind !== 'values') {
      throw new Error('Unexpected changes');
    }
    expect(page.page).toMatchObject({ name: 'Prices', slug: 'prices' });
    expect(hero.pageId).toBe(page.page.id);
    expect(hero.afterBlockId).toBeNull();
    expect(asked[2].request.user).toContain('- Prices ("prices")');
    expect(JSON.stringify(navChange.values.links)).toContain(`"pageId":"${page.page.id}"`);
  });

  it('gives a new page a free slug and still finds it by the slug the model used', async () => {
    answers.pick = { blocks: ['hero-centered'] };
    const changes = await changesFor({
      pages: [{ name: 'Home', slug: 'home' }],
      adds: [{ page: 'home-2', after: '', category: 'headers', theme: 'default', note: '' }],
    });
    const [page, hero] = changes;
    if (page.kind !== 'page' || hero.kind !== 'add') throw new Error('Unexpected changes');
    expect(page.page.slug).toBe('home-2');
    expect(hero.pageId).toBe(page.page.id);
  });

  it('turns the other decisions into changes and skips what it does not know', async () => {
    const changes = await changesFor({
      themes: [
        { section: 's2', theme: 'dark' },
        { section: 's99', theme: 'dark' },
      ],
      moves: [
        { section: 's3', after: '' },
        { section: 's3', after: 's99' },
      ],
      removes: ['s4', 's99'],
      tokens: [
        { name: '--color-primary', value: '#00aa55' },
        { name: '--no-such-token', value: '#000000' },
      ],
      headingFont: 'fraunces',
      bodyFont: 'No Such Font',
      title: 'Crumb',
      description: 'A bakery in Leeds.',
    });
    expect(changes).toEqual([
      { kind: 'theme', blockId: heroId, themeId: 'dark' },
      { kind: 'move', blockId: featuresId, afterBlockId: null },
      { kind: 'remove', blockId: photoHeroId },
      { kind: 'tokens', values: { '--color-primary': '#00aa55' } },
      {
        kind: 'font',
        change: expect.objectContaining({ role: 'heading', family: 'Fraunces' }),
      },
      { kind: 'setting', key: 'title', value: 'Crumb' },
      { kind: 'setting', key: 'description', value: 'A bakery in Leeds.' },
    ]);
  });
});

describe('applyProjectEdit', () => {
  it('applies every change and says what changed', () => {
    const pricing = builtInComponents.get('pricing-3-plans');
    if (pricing === undefined) throw new Error('The library has no pricing block');
    const first = createBlock(pricing.definition);
    const second = createBlock(pricing.definition);
    const pageId = project.pages.homePageId;
    const applied = applyProjectEdit(project, [
      { kind: 'page', page: { id: 'prices-page', name: 'Prices', slug: 'prices' } },
      { kind: 'add', pageId, afterBlockId: heroId, block: first },
      { kind: 'add', pageId, afterBlockId: heroId, block: second },
      {
        kind: 'add',
        pageId: 'prices-page',
        afterBlockId: null,
        block: { ...first, id: 'on-prices' },
      },
      { kind: 'values', blockId: heroId, values: { title: 'New title', eyebrow: 'New' } },
      { kind: 'theme', blockId: heroId, themeId: 'dark' },
      { kind: 'move', blockId: featuresId, afterBlockId: null },
      { kind: 'remove', blockId: photoHeroId },
      { kind: 'tokens', values: { '--color-primary': '#00aa55' } },
      { kind: 'setting', key: 'title', value: 'Crumb' },
      { kind: 'setting', key: 'description', value: 'A bakery in Leeds.' },
    ]);
    const edited = applied.project;
    expect(homePage(edited).blockIds).toEqual([featuresId, heroId, first.id, second.id, CUSTOM.id]);
    expect(edited.pages.entities['prices-page'].blockIds).toEqual(['on-prices']);
    expect(componentBlockOf(edited, heroId).values).toMatchObject({
      title: 'New title',
      eyebrow: 'New',
    });
    expect(Object.keys(componentBlockOf(edited, heroId).overrides).length).toBeGreaterThan(0);
    expect(edited.blocks.entities[photoHeroId]).toBeUndefined();
    expect(edited.designSystem.tokens['--color-primary'].value).toBe('#00aa55');
    expect(edited.settings).toMatchObject({ title: 'Crumb', description: 'A bakery in Leeds.' });
    expect(applied.summary).toEqual([
      'Added the page “Prices”',
      'Added “Pricing, three plans” to Home',
      'Added “Pricing, three plans” to Prices',
      'Rewrote “Hero, centered text”',
      'Changed the colors of “Hero, centered text”',
      'Moved “Features grid, 3 columns”',
      'Removed “Hero, text and image”',
      'Changed the design',
      'Renamed the site',
      'Changed the site description',
    ]);
    expect(project.settings.title).toBe('Fieldnote');
  });

  it('changes fonts through the font list', async () => {
    const changes = await changesFor({ headingFont: 'Fraunces' });
    const applied = applyProjectEdit(project, changes);
    expect(applied.summary).toEqual(['Changed the fonts']);
    expect(applied.project.designSystem.tokens['--font-heading'].value).toContain('Fraunces');
    const heading = applied.project.designSystem.fonts.find(({ role }) => role === 'heading');
    expect(heading?.family).toBe('Fraunces');
  });

  it('leaves the project alone when the sections are gone', () => {
    const applied = applyProjectEdit(project, [
      { kind: 'values', blockId: 'gone', values: { title: 'x' } },
      { kind: 'theme', blockId: 'gone', themeId: 'dark' },
      { kind: 'move', blockId: 'gone', afterBlockId: null },
      { kind: 'move', blockId: heroId, afterBlockId: navId },
      { kind: 'remove', blockId: 'gone' },
      { kind: 'add', pageId: 'gone', afterBlockId: null, block: CUSTOM },
      {
        kind: 'values',
        blockId: heroId,
        values: { title: componentBlockOf(project, heroId).values.title },
      },
    ]);
    expect(applied.project).toBe(project);
    expect(applied.summary).toEqual([]);
  });
});
