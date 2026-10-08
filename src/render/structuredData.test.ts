import { describe, expect, it } from 'vitest';
import { createSampleProject } from '../app/projectFactory';
import type { Page, ProjectSettings } from '../app/types';
import { buildStructuredData, jsonLdScript, type StructuredDataInput } from './structuredData';

function setup(changes: Partial<StructuredDataInput> = {}): StructuredDataInput {
  const project = createSampleProject();
  const page: Page = {
    ...project.pages.entities[project.pages.homePageId],
    seo: { noindex: false },
  };
  return {
    settings: { ...project.settings, baseUrl: 'https://acme.com' },
    page,
    base: 'https://acme.com',
    isHome: true,
    canonical: 'https://acme.com/',
    title: 'Home | Fieldnote',
    description: 'Research, tagged.',
    logoUrl: 'https://acme.com/assets/images/icon.png',
    ...changes,
  };
}

function graphOf(script: string | undefined): Record<string, unknown>[] {
  const json = script?.replace('<script type="application/ld+json">', '').replace('</script>', '');
  const data: unknown = JSON.parse(json ?? '');
  if (typeof data !== 'object' || data === null || !('@graph' in data)) {
    throw new Error('Expected a JSON-LD graph');
  }
  const graph: unknown = data['@graph'];
  if (!Array.isArray(graph)) throw new Error('Expected a list of nodes');
  return graph;
}

function withSettings(changes: Partial<ProjectSettings>): StructuredDataInput {
  const input = setup();
  return { ...input, settings: { ...input.settings, ...changes } };
}

describe('buildStructuredData', () => {
  it('describes the site, its organization and the home page', () => {
    const graph = graphOf(buildStructuredData(setup())[0]);
    expect(graph.map((node) => node['@type'])).toEqual(['WebSite', 'Organization', 'WebPage']);
    expect(graph[0]).toMatchObject({
      '@id': 'https://acme.com/#website',
      url: 'https://acme.com/',
      name: 'Fieldnote',
      publisher: { '@id': 'https://acme.com/#organization' },
    });
    expect(graph[1]).toMatchObject({ logo: 'https://acme.com/assets/images/icon.png' });
    expect(graph[2]).toMatchObject({
      url: 'https://acme.com/',
      isPartOf: { '@id': 'https://acme.com/#website' },
    });
  });

  it('describes only the page on other pages, with the chosen kind of page', () => {
    const input = setup({ isHome: false, canonical: 'https://acme.com/contact.html' });
    input.page.seo.schemaType = 'ContactPage';
    const graph = graphOf(buildStructuredData(input)[0]);
    expect(graph).toHaveLength(1);
    expect(graph[0]).toMatchObject({ '@type': 'ContactPage', name: 'Home | Fieldnote' });
  });

  it('describes a person with profiles and contact details', () => {
    const input = withSettings({
      schemaEntity: 'Person',
      entityName: 'Jane Doe',
      socialProfiles: 'https://github.com/jane\n\nhttps://x.com/jane',
      contactEmail: 'jane@acme.com',
    });
    const person = graphOf(buildStructuredData(input)[0])[1];
    expect(person).toMatchObject({
      '@type': 'Person',
      name: 'Jane Doe',
      image: 'https://acme.com/assets/images/icon.png',
      sameAs: ['https://github.com/jane', 'https://x.com/jane'],
      email: 'jane@acme.com',
    });
    expect(person).not.toHaveProperty('logo');
  });

  it('leaves out URLs and ids without a base URL', () => {
    const graph = graphOf(buildStructuredData(setup({ base: null, canonical: null }))[0]);
    expect(graph[0]).not.toHaveProperty('url');
    expect(graph[2]).not.toHaveProperty('isPartOf');
  });

  it('adds the custom JSON-LD of the site and the page and skips invalid JSON', () => {
    const input = withSettings({ schemaMarkup: false, jsonLd: '{"@type":"Event"}' });
    input.page.seo.jsonLd = '{ broken';
    const scripts = buildStructuredData(input);
    expect(scripts).toHaveLength(1);
    expect(scripts[0]).toContain('"@type": "Event"');
  });
});

describe('jsonLdScript', () => {
  it('escapes text that could close the script element', () => {
    const script = jsonLdScript({ name: '</script><script>alert(1)</script>' });
    expect(script).not.toContain('</script><script>');
    expect(script).toContain('\\u003c/script>');
    expect(script.endsWith('</script>')).toBe(true);
  });
});
