import {
  asListItems,
  isImageValue,
  isRecord,
  validateField,
  type ListItem,
} from '../../components/fields';
import {
  BUTTON_VARIANTS,
  LINK_TYPES,
  PLACEHOLDER_RATIOS,
  PLACEHOLDER_SUBJECTS,
  type ButtonVariant,
  type Field,
  type ImageValue,
  type LinkType,
  type LinkValue,
  type PlaceholderRatio,
  type PlaceholderSubject,
} from '../../components/types';
import { MAP_SETTING_FIELDS } from '../../render/handlebars';
import { isSemanticIcon } from '../../render/icons';
import { placeholderImage } from '../../render/placeholder';
import { normalizeRichText } from '../../render/sanitize';

export type SitePages = { ids: readonly string[]; homeId: string };

export type Kept = {
  pictures: ReadonlyMap<string, ImageValue>;
  icons: ReadonlySet<string>;
  anchors: ReadonlySet<string>;
};

const NOTHING_KEPT: Kept = { pictures: new Map(), icons: new Set(), anchors: new Set() };

export const LOCKED_FIELD_NAMES: readonly string[] = [
  'formAction',
  'formMethod',
  ...MAP_SETTING_FIELDS,
];

const DEFAULT_RATIO: PlaceholderRatio = '3:2';
const DEFAULT_SUBJECT: PlaceholderSubject = 'photo';

function knownChoice<Choice extends string>(
  choices: readonly Choice[],
  value: unknown,
): Choice | null {
  for (const choice of choices) {
    if (choice === value) return choice;
  }
  return null;
}

function shapedImage(field: Field, value: unknown, kept: Kept): unknown {
  if (!isRecord(value)) return undefined;
  const picture = typeof value.picture === 'string' ? kept.pictures.get(value.picture) : undefined;
  if (picture !== undefined) {
    const newAlt = typeof value.alt === 'string' ? value.alt.trim() : '';
    return newAlt === '' ? picture : { ...picture, alt: newAlt, decorative: false };
  }
  const standard = isImageValue(field.default) ? field.default : null;
  const usual = standard?.source === 'placeholder' ? standard.placeholder : null;
  const ratio = knownChoice(PLACEHOLDER_RATIOS, value.ratio) ?? usual?.ratio ?? DEFAULT_RATIO;
  const subject =
    knownChoice(PLACEHOLDER_SUBJECTS, value.subject) ?? usual?.subject ?? DEFAULT_SUBJECT;
  const givenAlt = typeof value.alt === 'string' ? value.alt.trim() : '';
  const alt = givenAlt === '' ? (standard?.alt ?? '') : givenAlt;
  return placeholderImage({ ratio, subject }, alt, alt === '');
}

function shapedLink(value: unknown, pages: SitePages, kept: Kept): LinkValue | undefined {
  if (!isRecord(value)) return undefined;
  const type: LinkType | null = knownChoice(LINK_TYPES, value.type);
  if (type === null) return undefined;
  if (type === 'page' || type === 'section') {
    const isKnownPage = typeof value.pageId === 'string' && pages.ids.includes(value.pageId);
    const pageId = isKnownPage && typeof value.pageId === 'string' ? value.pageId : pages.homeId;
    const { anchor } = value;
    const isKeptSection =
      type === 'section' && typeof anchor === 'string' && kept.anchors.has(anchor);
    if (isKeptSection && isKnownPage) return { type: 'section', pageId, anchor, newTab: false };
    if (isKeptSection) return { type: 'section', anchor, newTab: false };
    return { type: 'page', pageId, newTab: false };
  }
  const url = typeof value.url === 'string' ? value.url.trim() : '';
  return { type, url, newTab: type === 'url' && value.newTab === true };
}

function shapedButton(field: Field, value: unknown, pages: SitePages, kept: Kept): unknown {
  if (!isRecord(value)) return undefined;
  const link = shapedLink(value.link, pages, kept);
  if (link === undefined || typeof value.label !== 'string') return undefined;
  const usual = isRecord(field.default) ? field.default.variant : undefined;
  const variant: ButtonVariant =
    knownChoice(BUTTON_VARIANTS, value.variant) ?? knownChoice(BUTTON_VARIANTS, usual) ?? 'primary';
  return { label: value.label, link, variant };
}

function shapedText(field: Field, value: unknown): unknown {
  if (typeof value !== 'string' || field.maxLength === undefined) return value;
  return value.slice(0, field.maxLength);
}

function shaped(field: Field, value: unknown, pages: SitePages, kept: Kept): unknown {
  if (field.type === 'image') {
    return shapedImage(field, value, kept);
  } else if (field.type === 'link') {
    return shapedLink(value, pages, kept);
  } else if (field.type === 'button') {
    return shapedButton(field, value, pages, kept);
  } else if (field.type === 'text' || field.type === 'textarea') {
    return shapedText(field, value);
  } else if (field.type === 'richtext' && typeof value === 'string') {
    return normalizeRichText(value, { allowHeadings: field.allowHeadings });
  } else if (field.type === 'icon') {
    const isKnownIcon =
      typeof value === 'string' && (value === '' || isSemanticIcon(value) || kept.icons.has(value));
    return isKnownIcon || value === field.default ? value : undefined;
  } else {
    return value;
  }
}

function usableList(
  field: Field,
  value: unknown,
  pages: SitePages,
  kept: Kept,
): ListItem[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const given = asListItems(value).slice(0, field.maxItems);
  if (given.length < (field.minItems ?? 0)) return undefined;
  const items: ListItem[] = [];
  for (const item of given) items.push(safeValues(field.itemFields ?? [], item, pages, kept));
  return items;
}

export function usableValue(
  field: Field,
  untrusted: unknown,
  pages: SitePages,
  kept: Kept = NOTHING_KEPT,
): unknown {
  if (field.type === 'list') return usableList(field, untrusted, pages, kept);
  if (LOCKED_FIELD_NAMES.includes(field.name)) return undefined;
  const value = shaped(field, untrusted, pages, kept);
  const isUsable = value !== undefined && validateField(field, value) === null;
  return isUsable ? value : undefined;
}

export function safeValues(
  fields: readonly Field[],
  untrusted: unknown,
  pages: SitePages,
  kept: Kept = NOTHING_KEPT,
): Record<string, unknown> {
  const given = isRecord(untrusted) ? untrusted : {};
  const values: Record<string, unknown> = {};
  for (const field of fields) {
    const value = usableValue(field, given[field.name], pages, kept);
    values[field.name] = value === undefined ? structuredClone(field.default) : value;
  }
  return values;
}
