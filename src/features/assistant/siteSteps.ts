import { SECTION_THEME_IDS, type SectionThemeId } from '../../app/sectionThemes';
import { uniqueSlug } from '../../app/slugs';
import { isRecord } from '../../components/fields';
import {
  BUTTON_VARIANTS,
  PLACEHOLDER_RATIOS,
  PLACEHOLDER_SUBJECTS,
  type ComponentDefinition,
} from '../../components/types';
import { semanticIconNames } from '../../render/icons';
import {
  BRIEF_COLORS,
  briefFontNames,
  CORNERS,
  SHADOWS,
  SPACINGS,
  TYPE_SCALES,
} from '../design-system/designFromBrief';
import { defaultIconSetIds } from '../design-system/randomDesignSystem';
import { AssistantError, type JsonSchema } from './openRouter';
import { blockBrief, catalogText, isPageBlock, siteBlock } from './siteCatalog';
import { playbookText } from './sitePlaybooks';

export const MAX_QUESTIONS = 4;
export const MAX_PAGES = 8;
export const MAX_SECTIONS = 16;
export const MAX_CUSTOM_SECTIONS = 2;
export const DEFAULT_HEADER_ID = 'nav-simple';
export const DEFAULT_FOOTER_ID = 'footer-simple';

const MAX_SUGGESTIONS = 4;
const MAX_PART_SECTIONS = 5;
const MAX_MANY_SUGGESTIONS = 8;
const MAX_TITLE_LENGTH = 60;
const MAX_PAGE_NAME_LENGTH = 40;
const HOME_SLUG = 'home';
const DEFAULT_LANGUAGE = 'en';
const LANGUAGE_CODE = /^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$/;

export type SiteSize = 'onePage' | 'standard' | 'large';

type Range = { min: number; max: number };

type SizeRule = { label: string; pages: Range; home: Range; other: Range };

export const DEFAULT_SITE_SIZE: SiteSize = 'standard';

export const SITE_SIZES: Record<SiteSize, SizeRule> = {
  onePage: {
    label: 'One page',
    pages: { min: 1, max: 1 },
    home: { min: 9, max: 12 },
    other: { min: 0, max: 0 },
  },
  standard: {
    label: 'Home plus a few pages',
    pages: { min: 3, max: 4 },
    home: { min: 10, max: 14 },
    other: { min: 4, max: 8 },
  },
  large: {
    label: 'Large site',
    pages: { min: 5, max: MAX_PAGES },
    home: { min: 12, max: MAX_SECTIONS },
    other: { min: 5, max: 10 },
  },
};

export function siteSizeOf(label: string): SiteSize {
  if (label === SITE_SIZES.onePage.label) {
    return 'onePage';
  } else if (label === SITE_SIZES.large.label) {
    return 'large';
  } else {
    return DEFAULT_SITE_SIZE;
  }
}

export type Question = {
  question: string;
  suggestions: string[];
  allowsMany: boolean;
  recommended: string[];
};

export type Answered = { question: string; answer: string };

export type Clarification = { isClear: boolean; questions: Question[]; brief: string };

export type SectionPlan =
  | { kind: 'block'; blockId: string; theme: SectionThemeId; note: string }
  | { kind: 'custom'; description: string };

export type PagePlan = { name: string; slug: string; purpose: string; sections: SectionPlan[] };

export type SitePlan = {
  title: string;
  description: string;
  language: string;
  headerBlockId: string;
  footerBlockId: string;
  pages: PagePlan[];
};

export type SectionWriting =
  { kind: 'values'; values: unknown } | { kind: 'html'; html: string } | { kind: 'unwritten' };

export type PagePart = { page: PagePlan; first: number; count: number };

export type StepRequest = { system: string; user: string; schema: JsonSchema | null };

export const SYSTEM_PROMPT = [
  'You are the site-building assistant inside a visual website builder.',
  'People describe a website in plain language and you plan and write it.',
  'Answer with exactly one JSON object and nothing else: no prose, no markdown fences.',
  'Write all site text in the language of the description unless the brief says otherwise.',
  'Never use lorem ipsum. Never use em dashes or en dashes; use a plain hyphen.',
].join('\n');

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function objectSchema(properties: Record<string, unknown>): Record<string, unknown> {
  return {
    type: 'object',
    properties,
    required: Object.keys(properties),
    additionalProperties: false,
  };
}

const STRING = { type: 'string' };

function choice(values: readonly string[]): Record<string, unknown> {
  return { type: 'string', enum: [...values] };
}

function listOf(items: Record<string, unknown>): Record<string, unknown> {
  return { type: 'array', items };
}

const CLARIFY_SCHEMA: JsonSchema = {
  name: 'site_clarification',
  schema: objectSchema({
    isClear: { type: 'boolean' },
    questions: listOf(
      objectSchema({
        question: STRING,
        suggestions: listOf(STRING),
        allowsMany: { type: 'boolean' },
        recommended: listOf(STRING),
      }),
    ),
    brief: STRING,
  }),
};

export function clarifyRequest(description: string): StepRequest {
  const user = [
    'A person wants a website. Their description:',
    `"""${description}"""`,
    '',
    'Most people are not web designers and do not know what a good site needs, so think for them.',
    'First work out what kind of site this is (for example a local service, a restaurant, a portfolio, a shop, an app, an event).',
    'Then work out what the best sites of that kind have: which pages, and on each page which sections from top to bottom.',
    'These are the sections strong sites of common kinds have. Use the closest kind as a starting point and adapt it to this case:',
    playbookText(),
    '',
    'Then decide whether you know enough to build a site they will be happy with:',
    'what it is for, who it is for, the one action visitors should take, which pages and sections it needs, and the tone and look.',
    `If something that would change the site is unclear, set "isClear" to false and ask up to ${MAX_QUESTIONS} short questions.`,
    'You can ask only this once, so ask everything that matters now.',
    'Ask only what the person alone can know, such as the name, the town, what they offer or the style they like.',
    'For a business people visit or that serves an area, ask for the town or the address when it is missing.',
    'Ask nothing you can sensibly decide yourself.',
    'If the name of the business, person or project is missing, ask for it and give that question no suggestions.',
    `Give every other question 2 to ${MAX_SUGGESTIONS} short suggested answers.`,
    'Set "allowsMany" to true when several suggested answers can apply together, for example which sections to include.',
    'Then make each suggestion one single item (one page, one section, one feature), never a combination.',
    'When the description is short or vague, one question must propose the structure you worked out:',
    `ask which sections the site should have, set "allowsMany" to true and suggest up to ${MAX_MANY_SUGGESTIONS} sections that fit this kind of site.`,
    'In "recommended", repeat the suggested answers you would choose yourself (several only when "allowsMany" is true).',
    'For the structure question that is every section a typical great site of this kind has.',
    'If the description is already enough, set "isClear" to true and return no questions.',
    'Always write "brief": a compact build brief in plain sentences covering the site name, purpose, audience,',
    'main call to action, the pages and the sections of each page from top to bottom, tone of voice, visual direction,',
    'language, and every concrete fact the person gave (names, prices, address, opening hours, contact details).',
    'Never leave a placeholder in square brackets in the brief: when a fact is missing, choose something plausible.',
    'The exceptions are street addresses, phone numbers and email addresses: never make those up, and leave them out when the person did not give them.',
    'Leave out of the brief whatever you ask about. The answers are added below the brief afterwards.',
    '',
    'Return JSON: { "isClear": boolean, "questions": [{ "question": string, "suggestions": [string], "allowsMany": boolean, "recommended": [string] }], "brief": string }',
  ].join('\n');
  return { system: SYSTEM_PROMPT, user, schema: CLARIFY_SCHEMA };
}

export function briefWithAnswers(brief: string, answers: readonly Answered[]): string {
  const given: string[] = [];
  for (const { question, answer } of answers) {
    if (answer !== '') given.push(`- ${question}`, `  ${answer}`);
  }
  if (given.length === 0) return brief;
  return [
    brief,
    '',
    'The person then answered these questions. Their answers win over anything above:',
    ...given,
  ].join('\n');
}

export function parseClarification(value: unknown): Clarification {
  const answer = isRecord(value) ? value : {};
  const questions: Question[] = [];
  const given = Array.isArray(answer.questions) ? answer.questions : [];
  for (const entry of given) {
    if (questions.length === MAX_QUESTIONS) break;
    if (!isRecord(entry) || text(entry.question) === '') continue;
    const offered: string[] = [];
    for (const suggestion of Array.isArray(entry.suggestions) ? entry.suggestions : []) {
      if (text(suggestion) !== '') offered.push(text(suggestion));
    }
    const allowsMany = entry.allowsMany === true && offered.length > 1;
    const suggestions = offered.slice(0, allowsMany ? MAX_MANY_SUGGESTIONS : MAX_SUGGESTIONS);
    const recommended: string[] = [];
    const chosen = Array.isArray(entry.recommended) ? entry.recommended : [];
    for (const choice of chosen) {
      const isKnown = suggestions.includes(text(choice)) && !recommended.includes(text(choice));
      const hasRoom = allowsMany || recommended.length === 0;
      if (isKnown && hasRoom) recommended.push(text(choice));
    }
    questions.push({ question: text(entry.question), suggestions, allowsMany, recommended });
  }
  return {
    isClear: questions.length === 0,
    questions,
    brief: text(answer.brief),
  };
}

function colorProperties(): Record<string, unknown> {
  const properties: Record<string, unknown> = {};
  for (const name of BRIEF_COLORS) properties[name] = STRING;
  return properties;
}

export function designRequest(brief: string): StepRequest {
  const fonts = briefFontNames();
  const iconSets = defaultIconSetIds();
  const schema: JsonSchema = {
    name: 'design_brief',
    schema: objectSchema({
      colors: objectSchema(colorProperties()),
      headingFont: choice(fonts.headings),
      bodyFont: choice(fonts.bodies),
      headingWeight: { type: 'number' },
      typeScale: choice(TYPE_SCALES),
      baseSizePx: { type: 'number' },
      spacing: choice(SPACINGS),
      corners: choice(CORNERS),
      shadows: choice(SHADOWS),
      iconSet: choice(iconSets),
    }),
  };
  const user = [
    'Design a dedicated design system for this website. Build brief:',
    `"""${brief}"""`,
    '',
    'Make it feel made for this site, not generic. Think about the audience and the mood first, then choose.',
    'Colors are hex values like #1a2b3c:',
    '- background: the page background. Light or dark, whichever suits the site.',
    '- surface: cards and alternate sections, close to the background.',
    '- border: subtle lines on the background.',
    '- text: body text, clearly readable on the background (contrast 7:1 or better).',
    '- mutedText: secondary text, still readable on the background (4.5:1 or better).',
    '- primary: the brand color for buttons and links, readable on the background (4.5:1 or better).',
    '- darkBackground: the background of dark sections. It must be dark.',
    '- accent: the highlight color used on dark sections. It must be light and vivid.',
    `headingFont is one of: ${fonts.headings.join(', ')}.`,
    `bodyFont is one of: ${fonts.bodies.join(', ')}.`,
    'headingWeight is 400 to 900. baseSizePx is 15 to 18.',
    `typeScale is one of: ${TYPE_SCALES.join(', ')} (how much bigger headings are than text).`,
    `spacing is one of: ${SPACINGS.join(', ')}. corners is one of: ${CORNERS.join(', ')}.`,
    `shadows is one of: ${SHADOWS.join(', ')}. iconSet is one of: ${iconSets.join(', ')}.`,
    '',
    'Return JSON: { "colors": { "background", "surface", "border", "text", "mutedText", "primary", "darkBackground", "accent" },',
    '"headingFont", "bodyFont", "headingWeight", "typeScale", "baseSizePx", "spacing", "corners", "shadows", "iconSet" }',
  ].join('\n');
  return { system: SYSTEM_PROMPT, user, schema };
}

const PLAN_SCHEMA: JsonSchema = {
  name: 'site_plan',
  schema: objectSchema({
    title: STRING,
    description: STRING,
    language: STRING,
    header: STRING,
    footer: STRING,
    pages: listOf(
      objectSchema({
        name: STRING,
        slug: STRING,
        purpose: STRING,
        sections: listOf(
          objectSchema({
            block: STRING,
            custom: STRING,
            theme: choice(SECTION_THEME_IDS),
            note: STRING,
          }),
        ),
      }),
    ),
  }),
};

function sizeRules(size: SiteSize): string[] {
  const { label, pages, home, other } = SITE_SIZES[size];
  const pageCount = pages.min === pages.max ? `${pages.min}` : `${pages.min} to ${pages.max}`;
  const rules = [
    `- Site size: "${label}". Plan ${pageCount} ${pages.max === 1 ? 'page' : 'pages'}. The first page is the home page with slug "${HOME_SLUG}".`,
    `- The home page has ${home.min} to ${home.max} sections, top to bottom.`,
  ];
  if (other.max > 0) {
    rules.push(
      `- Every other page has ${other.min} to ${other.max} sections. Each one goes deeper on one thing (services, prices, the people, contact) and does not repeat the home page section by section.`,
    );
  }
  rules.push('- These numbers win over anything the brief says about length.');
  return rules;
}

export function planRequest(brief: string, size: SiteSize = DEFAULT_SITE_SIZE): StepRequest {
  const user = [
    'Plan the pages of this website from the block library below, the way an experienced web designer would. Build brief:',
    `"""${brief}"""`,
    '',
    'Rules:',
    ...sizeRules(size),
    '- Every page starts with exactly one block from the Headers category.',
    '- Never use a Headers block anywhere except as the first section of a page.',
    '- Do not put Navigations, Banners or Footers blocks in pages. "header" is one Navigations block id and "footer" is one Footers block id; they show on every page.',
    '- The sections the brief lists are the minimum. Add what a strong site of this kind also has until the page reaches its size: a proof strip (logos, ratings or numbers), how it works, people, a guarantee, common questions, a final call to action.',
    '- A good order: hero, proof, the offer, how it works, work or gallery, people, reviews, prices, common questions, long text, contact with map, final call to action.',
    '- Pick the block whose layout fits the content best. Use different blocks across pages, and never the same block twice on one page.',
    '- Avoid two sections from the same category next to each other, and vary the layouts: cards, then image beside text, then a list or a table.',
    '- A business with an address gets opening hours and a map. A trade or mobile service also gets the towns it serves and its licences, insurance or memberships.',
    '- A local service or a shop gets one long text section for search engines low on the home page, before the contact section.',
    '- Use a block with a live map only when the brief names a real address or town.',
    '- Most pages should end with a Call to action block.',
    '- "theme" sets the section colors: "default", "surface", "dark" or "primary". Alternate "default" and "surface" for rhythm, and use "dark" or "primary" sparingly for emphasis. Never put two "dark" sections next to each other.',
    '- "note" tells the copywriter what this section must say, in at most 12 words. "purpose" is a few words too.',
    `- Only when no block can show the content, describe a custom section in "custom" and leave "block" empty. At most ${MAX_CUSTOM_SECTIONS} per page. Otherwise leave "custom" empty.`,
    '- "title" is the site name. "description" is one sentence for search engines. "language" is a code like "en" or "pl".',
    '- Slugs use lowercase letters, digits and hyphens.',
    '',
    'What strong sites of common kinds have (pages, then the home page from top to bottom):',
    playbookText(),
    '',
    'Return JSON: { "title", "description", "language", "header", "footer",',
    '"pages": [{ "name", "slug", "purpose", "sections": [{ "block", "custom", "theme", "note" }] }] }',
    '',
    'Block library, one block per line as "id: name. description":',
    '',
    catalogText(),
  ].join('\n');
  return { system: SYSTEM_PROMPT, user, schema: PLAN_SCHEMA };
}

function themeOf(value: unknown): SectionThemeId {
  for (const theme of SECTION_THEME_IDS) {
    if (theme === value) return theme;
  }
  return 'default';
}

function plannedSections(value: unknown): SectionPlan[] {
  const sections: SectionPlan[] = [];
  const usedBlocks = new Set<string>();
  let customCount = 0;
  for (const entry of Array.isArray(value) ? value : []) {
    if (sections.length === MAX_SECTIONS) break;
    if (!isRecord(entry)) continue;
    const blockId = text(entry.block);
    const definition = blockId === '' ? null : siteBlock(blockId);
    const isLateHero = definition?.category === 'headers' && sections.length > 0;
    if (definition !== null && isLateHero) continue;
    if (definition !== null && isPageBlock(definition) && !usedBlocks.has(blockId)) {
      usedBlocks.add(blockId);
      sections.push({
        kind: 'block',
        blockId,
        theme: themeOf(entry.theme),
        note: text(entry.note),
      });
      continue;
    }
    const description = text(entry.custom);
    if (blockId === '' && description !== '' && customCount < MAX_CUSTOM_SECTIONS) {
      customCount += 1;
      sections.push({ kind: 'custom', description });
    }
  }
  return sections;
}

function slotBlockId(value: unknown, category: string, fallback: string): string {
  const definition = siteBlock(text(value));
  return definition !== null && definition.category === category ? definition.id : fallback;
}

export function parseSitePlan(value: unknown): SitePlan {
  const answer = isRecord(value) ? value : {};
  const pages: PagePlan[] = [];
  const slugs: string[] = [];
  for (const entry of Array.isArray(answer.pages) ? answer.pages : []) {
    if (pages.length === MAX_PAGES) break;
    if (!isRecord(entry)) continue;
    const sections = plannedSections(entry.sections);
    if (sections.length === 0) continue;
    const isHome = pages.length === 0;
    const name = text(entry.name).slice(0, MAX_PAGE_NAME_LENGTH) || (isHome ? 'Home' : 'Page');
    const wantedSlug = text(entry.slug) === '' ? name : text(entry.slug);
    const slug = isHome ? HOME_SLUG : uniqueSlug(wantedSlug, [HOME_SLUG, ...slugs]);
    slugs.push(slug);
    pages.push({ name, slug, purpose: text(entry.purpose), sections });
  }
  if (pages.length === 0) {
    throw new AssistantError(
      'answer',
      'The model planned no usable pages. Try again, or pick another model.',
    );
  }
  const language = text(answer.language);
  return {
    title: text(answer.title).slice(0, MAX_TITLE_LENGTH),
    description: text(answer.description),
    language: LANGUAGE_CODE.test(language) ? language : DEFAULT_LANGUAGE,
    headerBlockId: slotBlockId(answer.header, 'navigations', DEFAULT_HEADER_ID),
    footerBlockId: slotBlockId(answer.footer, 'footers', DEFAULT_FOOTER_ID),
    pages,
  };
}

function valueRules(plan: SitePlan): string[] {
  const pageList = plan.pages.map(({ name, slug }) => `"${slug}" (${name})`).join(', ');
  return [
    'How to write values, by field type:',
    '- text, textarea: plain text. Stay within maxLength and close to the length of the example, so the layout holds.',
    '- richtext: HTML using only p, strong, em, a, ul, ol and li. A field with "allowHeadings" may also use h3.',
    '- A long text section for search engines: 250 to 400 words in short paragraphs under two to four h3 subheadings that name the service and the town naturally.',
    '- select, segmented: exactly one of "options". boolean: true or false. number, range: within min and max.',
    '- date: "YYYY-MM-DD".',
    `- icon: one of these names: ${semanticIconNames().join(', ')}.`,
    `- image: { "alt": what the picture shows, "subject": one of ${PLACEHOLDER_SUBJECTS.join(', ')}, "ratio": one of ${PLACEHOLDER_RATIOS.join(', ')} }. Keep the example's ratio unless there is a reason.`,
    `- link: { "type": "page", "pageId": page slug } for a page of this site (${pageList}), or { "type": "url", "url": "https://..." }, { "type": "email", "url": address }, { "type": "phone", "url": number }.`,
    `- button: { "label": text, "link": a link as above, "variant": one of ${BUTTON_VARIANTS.join(', ')} }.`,
    '- list: an array of objects with the fields in "itemFields". Respect minItems and maxItems; "usualCount" is the count the layout was designed for.',
    'Give a value for every field. Keep layout choices from the example unless the note needs another.',
    'Write specific, concrete copy for this site: real service names, numbers, the town, what happens next. Use plausible invented names for people and companies where needed.',
    'An address shown on a live map must be the address or town from the brief, exactly as given. Never invent a street address for a map.',
  ];
}

function siteSummary(brief: string, plan: SitePlan): string[] {
  const lines = ['Build brief:', `"""${brief}"""`, '', `Site name: ${plan.title}`, 'Pages:'];
  for (const page of plan.pages) lines.push(`- ${page.name} ("${page.slug}"): ${page.purpose}`);
  return lines;
}

const CUSTOM_RULES = [
  'For a custom section return { "html": "..." } instead of values:',
  '- One root element: <section class="section"> holding <div class="container stack">.',
  '- Use only these classes: section, container, stack, cluster, grid, card, badge, eyebrow, prose, btn, btn-primary, btn-secondary, btn-ghost.',
  '- "grid" lays children out in responsive columns; set its minimum column width with style="--grid-min: 16rem".',
  '- For anything else use inline styles with design tokens only, such as var(--space-4), var(--color-surface), var(--color-border), var(--radius-md), var(--text-lg).',
  '- Use h2 for the section title and h3 below it. Tables are allowed.',
  '- No images, scripts, styles, iframes or forms, and no addresses of other sites.',
  '- Link to pages of this site as "<slug>.html"; the home page is "index.html".',
];

function sectionTask(section: SectionPlan, definitions: Map<string, ComponentDefinition>): unknown {
  if (section.kind === 'custom') return { custom: section.description };
  const definition = definitions.get(section.blockId);
  if (definition === undefined) return { custom: section.note };
  return { ...blockBrief(definition), note: section.note };
}

function definitionsOf(blockIds: readonly string[]): Map<string, ComponentDefinition> {
  const definitions = new Map<string, ComponentDefinition>();
  for (const blockId of blockIds) {
    const definition = siteBlock(blockId);
    if (definition !== null) definitions.set(blockId, definition);
  }
  return definitions;
}

export function pageParts(page: PagePlan): PagePart[] {
  const sectionCount = page.sections.length;
  const partCount = Math.ceil(sectionCount / MAX_PART_SECTIONS);
  const partSize = Math.ceil(sectionCount / partCount);
  const parts: PagePart[] = [];
  for (let first = 0; first < sectionCount; first += partSize) {
    parts.push({ page, first, count: Math.min(partSize, sectionCount - first) });
  }
  return parts;
}

function pageOutline(page: PagePlan, definitions: Map<string, ComponentDefinition>): string[] {
  const outline: string[] = [];
  for (const [index, section] of page.sections.entries()) {
    if (section.kind === 'custom') {
      outline.push(`${index + 1}. Custom section: ${section.description}`);
      continue;
    }
    const name = definitions.get(section.blockId)?.name ?? section.blockId;
    outline.push(`${index + 1}. ${name}: ${section.note}`);
  }
  return outline;
}

export function pageRequest(brief: string, plan: SitePlan, part: PagePart): StepRequest {
  const { page, first, count } = part;
  const blockIds: string[] = [];
  for (const section of page.sections) {
    if (section.kind === 'block') blockIds.push(section.blockId);
  }
  const definitions = definitionsOf(blockIds);
  const tasks: unknown[] = [];
  let hasCustom = false;
  for (const section of page.sections.slice(first, first + count)) {
    tasks.push(sectionTask(section, definitions));
    if (section.kind === 'custom') hasCustom = true;
  }
  const isWholePage = count === page.sections.length;
  const lines = [`Write the content of the page "${page.name}" (${page.purpose}).`];
  if (!isWholePage) {
    lines.push(
      `Write only sections ${first + 1} to ${first + count} of this page. The other sections are written separately at the same time.`,
      'The whole page from top to bottom, so your sections fit the ones around them and do not repeat them:',
      ...pageOutline(page, definitions),
      '',
    );
  }
  lines.push(...siteSummary(brief, plan), '', ...valueRules(plan), '');
  if (hasCustom) lines.push(...CUSTOM_RULES, '');
  lines.push(
    `Return JSON: { "sections": [...] } with exactly ${count} entries, in the same order as below.`,
    'Each entry is { "values": { fieldName: value } } for a library block.',
    '',
    isWholePage ? 'Sections of this page:' : 'Sections to write:',
    JSON.stringify(tasks),
  );
  return { system: SYSTEM_PROMPT, user: lines.join('\n'), schema: null };
}

export function sharedRequest(brief: string, plan: SitePlan): StepRequest {
  const definitions = definitionsOf([plan.headerBlockId, plan.footerBlockId]);
  const header = definitions.get(plan.headerBlockId);
  const footer = definitions.get(plan.footerBlockId);
  const user = [
    'Write the content of the navigation and the footer shown on every page.',
    ...siteSummary(brief, plan),
    '',
    'The navigation links to the pages of this site. Keep it short: the most important pages only.',
    '',
    ...valueRules(plan),
    '',
    'Return JSON: { "sections": [{ "values": {...} }, { "values": {...} }] }: first the navigation, then the footer.',
    '',
    'Blocks:',
    JSON.stringify([
      header === undefined ? null : blockBrief(header),
      footer === undefined ? null : blockBrief(footer),
    ]),
  ].join('\n');
  return { system: SYSTEM_PROMPT, user, schema: null };
}

export function parseSections(value: unknown, count: number): SectionWriting[] {
  const answer = isRecord(value) ? value : {};
  const given: unknown[] = Array.isArray(answer.sections) ? answer.sections : [];
  const sections: SectionWriting[] = [];
  for (let index = 0; index < count; index += 1) {
    const entry = given[index];
    if (isRecord(entry) && typeof entry.html === 'string') {
      sections.push({ kind: 'html', html: entry.html });
    } else {
      sections.push({ kind: 'values', values: isRecord(entry) ? entry.values : undefined });
    }
  }
  return sections;
}
