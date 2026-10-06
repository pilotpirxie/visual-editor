import type { TemplateDelegate } from 'handlebars';
import { describe, expect, it } from 'vitest';
import { createSampleProject } from '../app/projectFactory';
import type { Block } from '../app/types';
import { createBlock, registry } from '../components/registry';
import type { RegisteredComponent } from '../components/types';
import { createRenderContext, renderBlock } from './renderBlock';

function registered(componentId: string): RegisteredComponent {
  const component = registry.get(componentId);
  if (!component) throw new Error(`${componentId} is missing from the registry`);
  return component;
}

const hero = registered('hero-centered');
const content = registered('content-text-image');
const canvas = createRenderContext(createSampleProject(), 'canvas');
const exported = createRenderContext(createSampleProject(), 'export');

function heroBlock(changes: Partial<Block> = {}): Block {
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
      'style="--color-background: var(--color-surface); --color-text: #0f172a"',
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
