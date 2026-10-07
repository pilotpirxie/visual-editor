import { describe, expect, it, vi } from 'vitest';
import { createSampleProject } from '../../app/projectFactory';
import { createBlock, registry } from '../../components/registry';
import { createRenderContext, renderBlock } from '../../render/renderBlock';
import { quoteCardDefinition } from '../../test/packFixtures';
import {
  compiledComponent,
  customComponentProblems,
  ensureCustomComponents,
  projectRegistry,
} from './customComponents';

describe('custom component compile cache', () => {
  it('compiles a valid definition and adds it to the project registry', async () => {
    const custom = quoteCardDefinition();
    const project = createSampleProject();
    project.customDefinitions[custom.definition.id] = custom;
    expect(projectRegistry(project).has(custom.definition.id)).toBe(false);
    const { hasCompiled, problems } = await ensureCustomComponents([custom]);
    expect(hasCompiled).toBe(true);
    expect(problems).toEqual([]);
    const components = projectRegistry(project);
    expect(components.get(custom.definition.id)?.isCustom).toBe(true);
    expect(components.get('hero-centered')).toBe(registry.get('hero-centered'));
    expect(projectRegistry(project)).toBe(components);
  });

  it('refuses definitions that fail validation, such as one edited by hand in a project file', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const custom = {
      ...quoteCardDefinition({ id: 'hostile' }),
      styles: '.b-acme-hostile { position: fixed; inset: 0; }',
    };
    const { problems } = await ensureCustomComponents([custom]);
    expect(problems.length).toBeGreaterThan(0);
    expect(compiledComponent(custom)).toBeUndefined();
    expect(customComponentProblems(custom)).toEqual(problems);
  });

  it('cleans what a custom template renders before it reaches the page', async () => {
    const custom = quoteCardDefinition();
    await ensureCustomComponents([custom]);
    const component = compiledComponent(custom);
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
