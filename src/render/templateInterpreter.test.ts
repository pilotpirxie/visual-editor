import Handlebars from 'handlebars';
import { beforeAll, describe, expect, it } from 'vitest';
import { createSampleProject } from '../app/projectFactory';
import type { ComponentBlock, Project } from '../app/types';
import { createBlock, registry } from '../components/registry';
import type { RegisteredComponent } from '../components/types';
import { ensureProjectIconSets } from '../features/icons/ensureIconSets';
import { loadStarter, STARTERS } from '../starters/starters';
import { createRenderCollector, type RenderCollector } from './handlebars';
import { pageSlugsOf } from './renderBlock';
import { interpretTemplate, TemplateRenderError } from './templateInterpreter';
import { loadTemplateParser, type ParseTemplate } from './templateParser';

const sources = import.meta.glob<string>('../components/library/*/*/template.hbs', {
  eager: true,
  query: '?raw',
  import: 'default',
});

type Rendered = { html: string; collector: RenderCollector };

let parse: ParseTemplate;
const starterProjects: Project[] = [];

beforeAll(async () => {
  parse = await loadTemplateParser();
  for (const starter of STARTERS) {
    const project = await loadStarter(starter);
    await ensureProjectIconSets(project);
    starterProjects.push(project);
  }
});

function sourceOf(componentId: string): string {
  for (const [path, source] of Object.entries(sources)) {
    if (path.endsWith(`/${componentId}/template.hbs`)) return source;
  }
  throw new Error(`No template source for ${componentId}`);
}

function renderBoth(
  component: RegisteredComponent,
  block: ComponentBlock,
  project: Project,
): { precompiled: Rendered; interpreted: Rendered } {
  const context = {
    ...block.values,
    block: { id: block.id, anchor: block.anchor ?? '' },
    site: { title: project.settings.title },
  };
  function render(template: (context: unknown, options: { data: unknown }) => string): Rendered {
    const collector = createRenderCollector();
    const data = {
      pageSlugs: pageSlugsOf(project.pages),
      currentPageId: project.pages.homePageId,
      eagerImages: component.definition.category === 'headers',
      iconSet: project.designSystem.iconSet,
      language: project.settings.language,
      collector,
    };
    return { html: template(context, { data }), collector };
  }
  const interpreted = interpretTemplate(parse(sourceOf(component.definition.id)));
  return { precompiled: render(component.template), interpreted: render(interpreted) };
}

describe('interpretTemplate gives the same output as the precompiled templates', () => {
  it.each([...registry.values()])('$definition.id with its defaults', (component) => {
    const project = createSampleProject();
    const { precompiled, interpreted } = renderBoth(
      component,
      createBlock(component.definition),
      project,
    );
    expect(interpreted.html).toBe(precompiled.html);
    expect(interpreted.collector).toEqual(precompiled.collector);
  });

  it('for every block of every starter', () => {
    let compared = 0;
    for (const project of starterProjects) {
      for (const block of Object.values(project.blocks.entities)) {
        if (block.kind !== 'component') continue;
        const component = registry.get(block.componentId);
        if (component === undefined) continue;
        const { precompiled, interpreted } = renderBoth(component, block, project);
        expect(interpreted.html, `${project.id} ${block.id}`).toBe(precompiled.html);
        expect(interpreted.collector).toEqual(precompiled.collector);
        compared += 1;
      }
    }
    expect(compared).toBeGreaterThan(100);
  });
});

describe('interpretTemplate matches Handlebars on cases built-in templates do not use', () => {
  const CASES: Array<{ name: string; template: string; context: unknown }> = [
    {
      name: 'first, last and index of a list',
      template:
        '{{#each items}}{{#if @first}}[{{/if}}{{@index}}:{{this}}{{#if @last}}]{{/if}}{{/each}}',
      context: { items: ['a', 'b', 'c'] },
    },
    {
      name: 'object iteration with keys',
      template: '{{#each prices}}{{@key}}={{this}};{{/each}}',
      context: { prices: { monthly: 12, yearly: 120 } },
    },
    {
      name: 'each with else on an empty list',
      template: '{{#each items}}x{{else}}No items{{/each}}',
      context: { items: [] },
    },
    {
      name: 'whitespace control and comments',
      template: '<p>\n  {{~title~}}\n</p>{{! a comment }}{{!-- another --}}',
      context: { title: 'Hi' },
    },
    {
      name: 'standalone block lines',
      template: '<ul>\n  {{#each items}}\n  <li>{{name}}</li>\n  {{/each}}\n</ul>\n',
      context: { items: [{ name: 'One' }, { name: 'Two' }] },
    },
    {
      name: 'falsy values and null items',
      template: '{{zero}}|{{no}}|{{nothing}}|{{#each items}}[{{this}}]{{/each}}',
      context: { zero: 0, no: false, nothing: null, items: [null, 0, 'x'] },
    },
    {
      name: 'parent paths inside nested lists and unless',
      template:
        '{{#each groups}}{{#each items}}{{../name}}/{{name}}@{{@../index}}{{#unless @last}},{{/unless}}{{/each}};{{/each}}',
      context: {
        groups: [
          { name: 'A', items: [{ name: 'a1' }, { name: 'a2' }] },
          { name: 'B', items: [{ name: 'b1' }] },
        ],
      },
    },
    {
      name: 'escaping and triple braces',
      template: '{{html}}|{{{html}}}|{{list}}',
      context: { html: '<b title="x">&</b>', list: ['a', 'b'] },
    },
    {
      name: 'if with includeZero and else if chains',
      template: '{{#if count includeZero=true}}some{{else if fallback}}fallback{{else}}none{{/if}}',
      context: { count: 0, fallback: true },
    },
    {
      name: 'prototype properties stay hidden',
      template: '{{constructor}}|{{items.length}}|{{title.length}}',
      context: { items: [1, 2], title: 'abc' },
    },
  ];

  it.each(CASES)('$name', ({ template, context }) => {
    const expected = Handlebars.compile(template)(context);
    expect(interpretTemplate(parse(template))(context)).toBe(expected);
  });
});

describe('interpretTemplate refusals', () => {
  it('refuses partials and unknown block helpers instead of running them', () => {
    expect(() => interpretTemplate(parse('{{> header}}'))({})).toThrow(TemplateRenderError);
    expect(() => interpretTemplate(parse('{{#with a}}x{{/with}}'))({ a: 1 })).toThrow(
      'Unknown block helper "with"',
    );
  });
});
