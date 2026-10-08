import Handlebars from 'handlebars';
import { beforeAll, describe, expect, it } from 'vitest';
import { createSampleProject } from '../app/projectFactory';
import type { Project } from '../app/types';
import { builtInComponents, createBlock } from '../components/registry';
import { createRenderCollector } from './handlebars';
import { pageSlugsOf } from './renderBlock';
import { interpretTemplate, TemplateRenderError } from './templateInterpreter';
import { loadTemplateParser, type ParseTemplate } from './templateParser';

const sources = import.meta.glob<string>('../components/library/*/template.hbs', {
  eager: true,
  query: '?raw',
  import: 'default',
});

let parse: ParseTemplate;

beforeAll(async () => {
  parse = await loadTemplateParser();
});

function sourceOf(componentId: string): string {
  const source = sources[`../components/library/${componentId}/template.hbs`];
  if (source === undefined) throw new Error(`No template source for ${componentId}`);
  return source;
}

function renderData(project: Project): Record<string, unknown> {
  return {
    pageSlugs: pageSlugsOf(project.pages),
    currentPageId: project.pages.homePageId,
    iconSet: project.designSystem.iconSet,
    language: project.settings.language,
    collector: createRenderCollector(),
  };
}

describe('built-in templates parsed at build time', () => {
  it.each([...builtInComponents.values()])(
    '$definition.id renders like its source',
    (component) => {
      const project = createSampleProject();
      const block = createBlock(component.definition);
      const context = {
        ...block.values,
        block: { id: block.id, anchor: '' },
        site: { title: 'Site' },
      };
      const fromSource = interpretTemplate(parse(sourceOf(component.definition.id)));
      expect(component.template(context, { data: renderData(project) })).toBe(
        fromSource(context, { data: renderData(project) }),
      );
    },
  );
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
