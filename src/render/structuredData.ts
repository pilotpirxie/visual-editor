import { parseJsonLd, profileLines } from '../app/settingsRules';
import type { Page, ProjectSettings } from '../app/types';

export type StructuredDataInput = {
  settings: ProjectSettings;
  page: Page;
  base: string | null;
  isHome: boolean;
  canonical: string | null;
  title: string;
  description: string;
  logoUrl: string | null;
};

const SCHEMA_CONTEXT = 'https://schema.org';
const SCRIPT_UNSAFE = /</g;
const JSON_INDENT = 2;
const LINE_INDENT = '    ';

function nonEmpty(text: string | undefined): string | undefined {
  const trimmed = text?.trim() ?? '';
  return trimmed === '' ? undefined : trimmed;
}

function entityNode(input: StructuredDataInput, base: string | null): Record<string, unknown> {
  const { settings, logoUrl } = input;
  const entity = settings.schemaEntity ?? 'Organization';
  const profiles = profileLines(settings.socialProfiles);
  return {
    '@type': entity,
    '@id': base === null ? undefined : `${base}/#${entity.toLowerCase()}`,
    name: nonEmpty(settings.entityName) ?? settings.title,
    url: base === null ? undefined : `${base}/`,
    logo: entity === 'Organization' ? (logoUrl ?? undefined) : undefined,
    image: entity === 'Person' ? (logoUrl ?? undefined) : undefined,
    sameAs: profiles.length === 0 ? undefined : profiles,
    email: settings.contactEmail,
    telephone: settings.contactPhone,
  };
}

function generatedGraph(input: StructuredDataInput): Record<string, unknown> {
  const { settings, page, base, isHome, canonical, title, description } = input;
  const siteId = base === null ? undefined : `${base}/#website`;
  const graph: Record<string, unknown>[] = [];
  if (isHome) {
    const entity = entityNode(input, base);
    graph.push(
      {
        '@type': 'WebSite',
        '@id': siteId,
        url: base === null ? undefined : `${base}/`,
        name: settings.title,
        description: nonEmpty(settings.description),
        inLanguage: settings.language,
        publisher: entity['@id'] === undefined ? undefined : { '@id': entity['@id'] },
      },
      entity,
    );
  }
  graph.push({
    '@type': page.seo.schemaType ?? 'WebPage',
    '@id': canonical === null ? undefined : `${canonical}#webpage`,
    url: canonical ?? undefined,
    name: title,
    description: nonEmpty(description),
    inLanguage: settings.language,
    isPartOf: siteId === undefined ? undefined : { '@id': siteId },
  });
  return { '@context': SCHEMA_CONTEXT, '@graph': graph };
}

export function jsonLdScript(data: unknown): string {
  const json = JSON.stringify(data, null, JSON_INDENT).replace(SCRIPT_UNSAFE, '\\u003c');
  const body = json
    .split('\n')
    .map((line) => `${LINE_INDENT}${line}`)
    .join('\n');
  return `  <script type="application/ld+json">\n${body}\n  </script>`;
}

function customData(text: string | undefined): unknown {
  if (text === undefined || text.trim() === '') return null;
  return parseJsonLd(text);
}

export function buildStructuredData(input: StructuredDataInput): string[] {
  const scripts: string[] = [];
  if (input.settings.schemaMarkup !== false) scripts.push(jsonLdScript(generatedGraph(input)));
  for (const text of [input.settings.jsonLd, input.page.seo.jsonLd]) {
    const data = customData(text);
    if (data !== null) scripts.push(jsonLdScript(data));
  }
  return scripts;
}
