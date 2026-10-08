import type { TemplateDelegate } from 'handlebars';
import { describe, expect, it } from 'vitest';
import { createSampleProject } from '../app/projectFactory';
import { sectionThemeById } from '../app/sectionThemes';
import type { ComponentBlock, HtmlBlock } from '../app/types';
import { builtInComponents, createBlock } from '../components/registry';
import type { RegisteredComponent } from '../components/types';
import {
  convertBlockToHtml,
  createRenderContext,
  renderBlock,
  renderHtmlBlock,
} from './renderBlock';

function registered(componentId: string): RegisteredComponent {
  const component = builtInComponents.get(componentId);
  if (!component) throw new Error(`${componentId} is missing from the built-in blocks`);
  return component;
}

const hero = registered('hero-centered');
const content = registered('content-text-image');
const canvas = createRenderContext(createSampleProject(), 'canvas');
const exported = createRenderContext(createSampleProject(), 'export');

function heroBlock(changes: Partial<ComponentBlock> = {}): ComponentBlock {
  return { ...createBlock(hero.definition), ...changes };
}

describe('renderBlock', () => {
  it('adds the editor attributes to the root element in canvas mode', () => {
    const block = heroBlock();
    const html = renderBlock(block, hero, canvas);
    expect(html).toMatch(
      new RegExp(
        `^<header data-component="hero-centered" data-block-id="${block.id}" class="b-hero-centered section"`,
      ),
    );
    expect(html).toContain('data-field="title"');
  });

  it('escapes field values', () => {
    const block = heroBlock();
    block.values.title = '<script>alert(1)</script>';
    const html = renderBlock(block, hero, canvas);
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
  });

  it('renders overrides as inline custom properties on the root', () => {
    const block = heroBlock({
      overrides: { '--color-background': 'var(--color-surface)', '--color-text': '#0f172a' },
    });
    expect(renderBlock(block, hero, canvas)).toContain(
      'style="--color-background: var(--color-surface); --color-text: #0f172a; --section-bg: var(--color-surface)"',
    );
  });

  it('leaves the section background alone when a section theme is applied', () => {
    const dark = sectionThemeById('dark');
    if (dark === null) throw new Error('No dark section theme');
    const block = heroBlock({ overrides: { ...dark.overrides } });
    expect(renderBlock(block, hero, canvas)).not.toContain('--section-bg');
  });

  it('puts the anchor id and extra classes on the root element', () => {
    const block = heroBlock({ anchor: 'pricing', extraClasses: ['promo', 'wide'] });
    const html = renderBlock(block, hero, canvas);
    expect(html).toMatch(
      /^<header data-component="hero-centered" data-block-id="[^"]+" id="pricing" class="b-hero-centered section promo wide">/,
    );
  });

  it('lets templates read the anchor', () => {
    const block = heroBlock({ anchor: 'top' });
    const template: TemplateDelegate = (values) =>
      `<section class="b-x" data-anchor="${String(values.block.anchor)}"></section>`;
    expect(renderBlock(block, { ...hero, template }, canvas)).toContain('data-anchor="top"');
  });

  it('adds hide-on-device classes in export and preview mode, never while editing', () => {
    const block = heroBlock({ hideOn: ['phone', 'desktop'] });
    const preview = createRenderContext(createSampleProject(), 'preview');
    expect(renderBlock(block, hero, exported)).toContain(
      'class="b-hero-centered section hide-phone hide-desktop"',
    );
    expect(renderBlock(block, hero, preview)).toContain(
      `data-block-id="${block.id}" class="b-hero-centered section hide-phone hide-desktop"`,
    );
    expect(renderBlock(block, hero, canvas)).toContain('class="b-hero-centered section"');
  });

  it('adds a class attribute when the root has none', () => {
    const template: TemplateDelegate = () => '<section data-x="1"></section>';
    const block = heroBlock({ extraClasses: ['extra'] });
    expect(renderBlock(block, { ...hero, template }, exported)).toBe(
      '<section data-component="hero-centered" data-x="1" class="extra"></section>',
    );
  });

  it('drops editor attributes in export mode', () => {
    const html = renderBlock(heroBlock(), hero, exported);
    expect(html).not.toContain('data-block-id');
    expect(html).not.toContain('data-field');
    expect(html).toContain('data-component="hero-centered"');
  });

  it('keeps text the user typed even when it looks like an editor attribute', () => {
    const block = { ...createBlock(content.definition) };
    block.values = { ...block.values, body: '<p>Write data-field="x" in your HTML</p>' };
    const html = renderBlock(block, content, exported);
    expect(html).toContain('Write data-field="x" in your HTML');
    expect(html).not.toMatch(/<[^>]+data-field=/);
  });

  it('sanitizes stored rich text when rendering it', () => {
    const block = { ...createBlock(content.definition) };
    block.values = {
      ...block.values,
      body: '<p>Hi<img src="x" onerror="alert(1)"></p><script>alert(2)</script>',
    };
    const html = renderBlock(block, content, canvas);
    expect(html).toContain('<p>Hi</p>');
    expect(html).not.toContain('onerror');
    expect(html).not.toContain('<script>');
  });

  it('rejects a template that does not start with its root element', () => {
    const plainText: TemplateDelegate = () => 'just text';
    const broken: RegisteredComponent = { ...hero, template: plainText };
    expect(() => renderBlock(heroBlock(), broken, canvas)).toThrow(
      /must start with its root element/,
    );
  });
});

describe('createRenderContext', () => {
  it('maps every page to its file name, with the home page as index', () => {
    const project = createSampleProject();
    const context = createRenderContext(project, 'export');
    expect(context.pageSlugs).toEqual({ [project.pages.homePageId]: 'index' });
    expect(context.site.title).toBe('Fieldnote');
    expect(context.mode).toBe('export');
  });

  it('skips page ids that have no page', () => {
    const project = createSampleProject();
    const withDanglingId = {
      ...project,
      pages: { ...project.pages, ids: [...project.pages.ids, 'gone'] },
    };
    expect(createRenderContext(withDanglingId, 'canvas').pageSlugs).not.toHaveProperty('gone');
  });
});

describe('renderHtmlBlock', () => {
  const htmlBlock: HtmlBlock = {
    id: 'h1',
    kind: 'html',
    html: '<section class="b-x"><p onclick="x()">Hi</p></section>',
    disabled: false,
    anchor: 'story',
    extraClasses: ['wide'],
    hideOn: ['phone'],
  };

  it('wraps the cleaned markup for selection on the canvas', () => {
    expect(renderHtmlBlock(htmlBlock, canvas)).toBe(
      '<div data-block-id="h1" data-html-block=""><section class="b-x wide" id="story"><p>Hi</p></section></div>',
    );
  });

  it('writes the cleaned markup as it is in the export, with hide classes', () => {
    expect(renderHtmlBlock(htmlBlock, exported)).toBe(
      '<section class="b-x wide hide-phone" id="story"><p>Hi</p></section>',
    );
  });
});

describe('convertBlockToHtml', () => {
  const project = createSampleProject();

  it('keeps the component class, the component id and the overrides', () => {
    const block = heroBlock({ overrides: { '--color-background': 'var(--color-surface)' } });
    const html = convertBlockToHtml(block, hero, project);
    expect(html).toContain('data-component="hero-centered"');
    expect(html).toContain('class="b-hero-centered section"');
    expect(html).toContain('--color-background: var(--color-surface)');
  });

  it('leaves out the anchor, extra classes, hide classes and editor attributes', () => {
    const block = heroBlock({ anchor: 'top', extraClasses: ['promo'], hideOn: ['phone'] });
    const html = convertBlockToHtml(block, hero, project);
    expect(html).not.toContain('id="top"');
    expect(html).not.toContain('promo');
    expect(html).not.toContain('hide-phone');
    expect(html).not.toContain('data-block-id');
    expect(html).not.toContain('data-field');
  });

  it('writes the current field values and leaves the block itself unchanged', () => {
    const block = heroBlock({ anchor: 'top' });
    block.values.title = 'Ship faster';
    const html = convertBlockToHtml(block, hero, project);
    expect(html).toContain('Ship faster');
    expect(block.anchor).toBe('top');
  });
});
