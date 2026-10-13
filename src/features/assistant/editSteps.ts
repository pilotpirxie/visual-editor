import { slotForCategory } from '../../app/blockLists';
import { SECTION_THEME_IDS, type SectionThemeId } from '../../app/sectionThemes';
import { isRecord } from '../../components/fields';
import { CATEGORIES, type Category, type ComponentDefinition } from '../../components/types';
import { briefFontNames } from '../design-system/designFromBrief';
import type { JsonSchema } from './openRouter';
import {
  blockBrief,
  catalogText,
  firstBlockOf,
  HIDDEN_CATEGORIES,
  isPageBlock,
  siteBlock,
} from './siteCatalog';
import {
  choice,
  listOf,
  objectSchema,
  STRING,
  valueRules,
  type PageName,
  type StepRequest,
} from './siteSteps';

export const MAX_EDITS = 12;
const MAX_ADDS = 12;
export const MAX_NEW_PAGES = 3;

const MAX_TOKEN_CHANGES = 80;
const MAX_NOTE_WORDS = 25;
const MAX_REPLY_CHARS = 600;

export type Exchange = { request: string; reply: string };

type SectionEdit = { ref: string; instruction: string };

export type SectionAdd = {
  page: string;
  after: string;
  category: Category;
  theme: SectionThemeId;
  note: string;
};

type SectionMove = { ref: string; after: string };

type SectionThemeChange = { ref: string; theme: SectionThemeId };

export type Decision = {
  reply: string;
  edits: SectionEdit[];
  adds: SectionAdd[];
  removes: string[];
  moves: SectionMove[];
  themes: SectionThemeChange[];
  pages: PageName[];
  tokens: Record<string, string>;
  headingFont: string;
  bodyFont: string;
  title: string;
  description: string;
};

export type SiteFacts = { title: string; description: string; pages: readonly PageName[] };

export type WriteTask = {
  definition: ComponentDefinition;
  note: string;
  current: Record<string, unknown> | null;
};

const SYSTEM_PROMPT = [
  'You are the assistant inside a visual website builder.',
  'You change an existing website the way its owner asks, in plain language.',
  'Answer with exactly one JSON object and nothing else: no prose, no markdown fences.',
  'Write site text in the language the site already uses unless the owner asks for another.',
  'Never use lorem ipsum. Never use em dashes or en dashes; use a plain hyphen.',
].join('\n');

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function entriesOf(value: unknown, limit: number): Record<string, unknown>[] {
  const entries: Record<string, unknown>[] = [];
  for (const entry of Array.isArray(value) ? value : []) {
    if (entries.length === limit) break;
    if (isRecord(entry)) entries.push(entry);
  }
  return entries;
}

export function addableCategories(): Category[] {
  const categories: Category[] = [];
  for (const { id } of CATEGORIES) {
    if (!HIDDEN_CATEGORIES.includes(id) && slotForCategory(id) === null) categories.push(id);
  }
  return categories;
}

const DECIDE_SCHEMA: JsonSchema = {
  name: 'site_changes',
  schema: objectSchema({
    reply: STRING,
    edits: listOf(objectSchema({ section: STRING, instruction: STRING })),
    adds: listOf(
      objectSchema({
        page: STRING,
        after: STRING,
        category: choice(addableCategories()),
        theme: choice(SECTION_THEME_IDS),
        note: STRING,
      }),
    ),
    removes: listOf(STRING),
    moves: listOf(objectSchema({ section: STRING, after: STRING })),
    themes: listOf(objectSchema({ section: STRING, theme: choice(SECTION_THEME_IDS) })),
    pages: listOf(objectSchema({ name: STRING, slug: STRING })),
    tokens: listOf(objectSchema({ name: STRING, value: STRING })),
    headingFont: STRING,
    bodyFont: STRING,
    title: STRING,
    description: STRING,
  }),
};

export function decideRequest(
  outline: string,
  request: string,
  earlier: readonly Exchange[],
): StepRequest {
  const fonts = briefFontNames();
  const lines = [
    'The owner of a website asks for a change. Decide what has to change.',
    'The text of the sections is written in a later step, so here you only say which sections change and how.',
    '',
    'The website now. Every section has an id in square brackets:',
    outline,
    '',
  ];
  if (earlier.length > 0) {
    lines.push('Earlier in this conversation, oldest first:');
    for (const exchange of earlier) {
      lines.push(`- They asked: ${exchange.request}`, `  You answered: ${exchange.reply}`);
    }
    lines.push('');
  }
  lines.push(
    'The request:',
    `"""${request}"""`,
    '',
    'Rules:',
    '- Change only what the request asks for. Leave every list empty that the request does not need.',
    '- "This page" is the page marked as open. "This section" or "this" is the section marked as selected, when there is one.',
    '- "edits": sections whose content changes. "section" is the id of the section. "instruction" tells the copywriter exactly what to change and repeats every fact the person gave, such as names, prices and phone numbers.',
    `- "adds": new sections. "page" is the slug of the page. "after" is the id of the section the new one goes below, or "" for the top of the page. "category" is one of: ${addableCategories().join(', ')}. "note" says what the section must say, in at most ${MAX_NOTE_WORDS} words.`,
    '- Only a "headers" section can be the first section of a page, and a page has one "headers" section.',
    '- "removes": ids of sections to delete. "moves": a section goes below the section "after" on its own page, or to the top with "".',
    `- "themes" and the "theme" of a new section are section colors: ${SECTION_THEME_IDS.join(', ')}. Match the sections around a new one.`,
    `- "pages": new pages, at most ${MAX_NEW_PAGES}, each with a "name" and a "slug" of lowercase letters, digits and hyphens. Give every new page its sections in "adds", starting with one "headers" section, and add a link to it with an edit of the navigation.`,
    '- "tokens": design changes as { "name", "value" }, only for tokens from the list above. Colors are hex values like #1a2b3c. Keep text readable on its background (contrast 4.5:1 or better) and change the tokens that belong together, such as a color and its contrast color.',
    `- "headingFont" and "bodyFont": "" to keep the font. Otherwise a heading font from: ${fonts.headings.join(', ')}. A body font from: ${fonts.bodies.join(', ')}.`,
    '- "title" and "description": a new site name or search description, or "" to keep it.',
    '- You cannot create or upload pictures, edit custom HTML sections, delete pages or set where forms send their data. When the request needs one of those, change what you can and say so in "reply".',
    '- "reply": one or two short, friendly sentences for the person, in the language of the request, saying what you changed. Never mention ids, JSON or token names. When the request is unclear, change nothing and ask one short question.',
    '',
    'Return JSON: { "reply", "edits": [{ "section", "instruction" }], "adds": [{ "page", "after", "category", "theme", "note" }],',
    '"removes": [id], "moves": [{ "section", "after" }], "themes": [{ "section", "theme" }], "pages": [{ "name", "slug" }],',
    '"tokens": [{ "name", "value" }], "headingFont", "bodyFont", "title", "description" }',
  );
  return { system: SYSTEM_PROMPT, user: lines.join('\n'), schema: DECIDE_SCHEMA };
}

function themeOf(value: unknown): SectionThemeId | null {
  for (const theme of SECTION_THEME_IDS) {
    if (theme === value) return theme;
  }
  return null;
}

function addsOf(value: unknown): SectionAdd[] {
  const categories = addableCategories();
  const adds: SectionAdd[] = [];
  for (const entry of entriesOf(value, MAX_ADDS)) {
    const category = categories.find((id) => id === entry.category);
    if (category === undefined || text(entry.page) === '') continue;
    adds.push({
      page: text(entry.page),
      after: text(entry.after),
      category,
      theme: themeOf(entry.theme) ?? 'default',
      note: text(entry.note),
    });
  }
  return adds;
}

function editsOf(value: unknown): SectionEdit[] {
  const edits: SectionEdit[] = [];
  for (const entry of entriesOf(value, MAX_EDITS)) {
    const isUsable = text(entry.section) !== '' && text(entry.instruction) !== '';
    if (isUsable) edits.push({ ref: text(entry.section), instruction: text(entry.instruction) });
  }
  return edits;
}

function removesOf(value: unknown): string[] {
  const removes: string[] = [];
  for (const ref of Array.isArray(value) ? value : []) {
    if (text(ref) !== '' && !removes.includes(text(ref))) removes.push(text(ref));
  }
  return removes;
}

function movesOf(value: unknown): SectionMove[] {
  const moves: SectionMove[] = [];
  for (const entry of entriesOf(value, MAX_EDITS)) {
    if (text(entry.section) !== '') {
      moves.push({ ref: text(entry.section), after: text(entry.after) });
    }
  }
  return moves;
}

function themesOf(value: unknown): SectionThemeChange[] {
  const themes: SectionThemeChange[] = [];
  for (const entry of entriesOf(value, MAX_EDITS)) {
    const theme = themeOf(entry.theme);
    if (theme !== null && text(entry.section) !== '') {
      themes.push({ ref: text(entry.section), theme });
    }
  }
  return themes;
}

function pagesOf(value: unknown): PageName[] {
  const pages: PageName[] = [];
  for (const entry of entriesOf(value, MAX_NEW_PAGES)) {
    if (text(entry.name) !== '') pages.push({ name: text(entry.name), slug: text(entry.slug) });
  }
  return pages;
}

function tokensOf(value: unknown): Record<string, string> {
  const tokens: Record<string, string> = {};
  for (const entry of entriesOf(value, MAX_TOKEN_CHANGES)) {
    const name = text(entry.name);
    if (name !== '' && text(entry.value) !== '') tokens[name] = text(entry.value);
  }
  return tokens;
}

export function parseDecision(value: unknown): Decision {
  const answer = isRecord(value) ? value : {};
  return {
    reply: text(answer.reply).slice(0, MAX_REPLY_CHARS),
    edits: editsOf(answer.edits),
    adds: addsOf(answer.adds),
    removes: removesOf(answer.removes),
    moves: movesOf(answer.moves),
    themes: themesOf(answer.themes),
    pages: pagesOf(answer.pages),
    tokens: tokensOf(answer.tokens),
    headingFont: text(answer.headingFont),
    bodyFont: text(answer.bodyFont),
    title: text(answer.title),
    description: text(answer.description),
  };
}

const PICK_SCHEMA: JsonSchema = {
  name: 'section_blocks',
  schema: objectSchema({ blocks: listOf(STRING) }),
};

export function pickRequest(adds: readonly SectionAdd[]): StepRequest {
  const categories: Category[] = [];
  const wanted: string[] = [];
  for (const [index, add] of adds.entries()) {
    if (!categories.includes(add.category)) categories.push(add.category);
    wanted.push(`${index + 1}. Category "${add.category}": ${add.note}`);
  }
  const user = [
    'New sections are added to a website. Pick the block from the library whose layout fits each one best.',
    '',
    'New sections:',
    ...wanted,
    '',
    'Pick each block from the category named for its section, and a different block for every section.',
    `Return JSON: { "blocks": [block id] } with exactly ${adds.length} ids, in the same order as the sections.`,
    '',
    'Block library, one block per line as "id: name. description":',
    '',
    catalogText(categories),
  ].join('\n');
  return { system: SYSTEM_PROMPT, user, schema: PICK_SCHEMA };
}

export function parsePicks(
  value: unknown,
  adds: readonly SectionAdd[],
): (ComponentDefinition | null)[] {
  const answer = isRecord(value) ? value : {};
  const given: unknown[] = Array.isArray(answer.blocks) ? answer.blocks : [];
  const picked: (ComponentDefinition | null)[] = [];
  for (const [index, add] of adds.entries()) {
    const definition = siteBlock(text(given[index]));
    const isUsable = definition !== null && isPageBlock(definition);
    picked.push(isUsable ? definition : firstBlockOf(add.category));
  }
  return picked;
}

export function writeRequest(site: SiteFacts, tasks: readonly WriteTask[]): StepRequest {
  const sections: unknown[] = [];
  for (const { definition, note, current } of tasks) {
    if (current === null) {
      sections.push({ ...blockBrief(definition), note });
    } else {
      sections.push({ ...blockBrief(definition, false), note, current });
    }
  }
  const lines = [
    'Write the content of sections of an existing website.',
    `Site name: ${site.title}`,
    `About the site: ${site.description}`,
    'Pages:',
  ];
  for (const page of site.pages) lines.push(`- ${page.name} ("${page.slug}")`);
  lines.push(
    '',
    ...valueRules(site.pages),
    '',
    'Every section below has a "note" that says what to write or what to change.',
    'A section without "current" is new: give a value for every field, and keep layout choices from the example unless the note needs another.',
    'A section with "current" is on the site already, and "current" is its content now.',
    'Change only what its note asks for and return only the fields you change.',
    'Return a changed list whole, with every item, also the items that stay as they are.',
    'An image in "current" with a "picture" id is a real picture. To keep it, return it as it is, with its "picture" id. Without the id it turns into an empty placeholder.',
    'Keep every icon, link and button that the note does not ask to change exactly as it is in "current".',
    '',
    `Return JSON: { "sections": [...] } with exactly ${tasks.length} entries, in the same order as below.`,
    'Each entry is { "values": { fieldName: value } }.',
    '',
    'Sections:',
    JSON.stringify(sections),
  );
  return { system: SYSTEM_PROMPT, user: lines.join('\n'), schema: null };
}
