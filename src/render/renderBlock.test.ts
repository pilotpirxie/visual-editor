import type { TemplateDelegate } from 'handlebars';
import { describe, expect, it } from 'vitest';
import { createSampleProject } from '../app/projectFactory';
import type { Block } from '../app/types';
import { createBlock, registry } from '../components/registry';
import type { RegisteredComponent } from '../components/types';
import { createRenderContext, renderBlock } from './renderBlock';

const registeredHero = registry.get('hero-centered');
if (!registeredHero) throw new Error('hero-centered is missing from the registry');
const hero: RegisteredComponent = registeredHero;
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

  it('rejects a template that does not start with its root element', () => {
    const plainText: TemplateDelegate = () => 'just text';
    const broken: RegisteredComponent = { ...hero, template: plainText };
    expect(() => renderBlock(heroBlock(), broken, canvas)).toThrow(
      /must start with its root element/,
    );
  });
});
