import { describe, expect, it, vi } from 'vitest';
import { createSampleProject } from '../app/projectFactory';
import { createRenderContext, renderBlock } from '../render/renderBlock';
import { quoteCardDefinition } from '../test/packFixtures';
import {
  builtInComponents,
  compiledPackBlock,
  componentsFor,
  createBlock,
  ensurePackBlocks,
  packBlockProblems,
} from './registry';

describe('pack block compile cache', () => {
  it('compiles a valid definition and adds it to the project registry', async () => {
    const custom = quoteCardDefinition();
    const project = createSampleProject();
    project.packBlocks[custom.definition.id] = custom;
    expect(componentsFor(project).has(custom.definition.id)).toBe(false);
    const { hasCompiled, problems } = await ensurePackBlocks([custom]);
    expect(hasCompiled).toBe(true);
    expect(problems).toEqual([]);
    const components = componentsFor(project);
    expect(components.get(custom.definition.id)?.pack.id).toBe('acme');
    expect(components.get('hero-centered')).toBe(builtInComponents.get('hero-centered'));
    expect(componentsFor(project)).toBe(components);
  });

  it('refuses definitions that fail validation, such as one edited by hand in a project file', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const custom = {
      ...quoteCardDefinition({}, '1.0.0', 'hostile'),
      styles: '.b-acme-hostile { position: fixed; inset: 0; }',
    };
    const { problems } = await ensurePackBlocks([custom]);
    expect(problems.length).toBeGreaterThan(0);
    expect(compiledPackBlock(custom)).toBeUndefined();
    expect(packBlockProblems(custom)).toEqual(problems);
  });

  it('cleans what a custom template renders before it reaches the page', async () => {
    const custom = quoteCardDefinition();
    await ensurePackBlocks([custom]);
    const component = compiledPackBlock(custom);
    if (component === undefined) throw new Error('The fixture did not compile');
    const hostile = {
      ...component,
      template: () =>
        '<section class="b-acme-quote-card"><img src="x" onerror="alert(1)"></section>',
    };
    const project = createSampleProject();
    const html = renderBlock(
      createBlock(custom.definition),
      hostile,
      createRenderContext(project, 'export'),
    );
    expect(html).not.toContain('onerror');
    expect(html).toContain('data-component="acme/quote-card"');
  });
});
