import { iconStyleOf, type IconSetData } from '../../packages/icon-data/src/convert';
import semanticIcons from './semantic-icons.json';

export type ResolvedIcon = {
  set: string;
  name: string;
  body: string;
  width: number;
  height: number;
};

export type IconRef = { set: string | null; name: string };

export type SpriteIcon = ResolvedIcon & { symbolId: string };

export const DEFAULT_ICON_SET = 'lucide';

const SEMANTIC_ICONS: Record<string, Record<string, string>> = semanticIcons;

const EXACT_MATCH = 0;
const PREFIX_MATCH = 1;
const PARTIAL_MATCH = 2;
const NOT_ID_CHARACTERS = /[^a-z0-9]+/gi;
const WHITESPACE = /\s+/g;

const iconSets = new Map<string, IconSetData>();

export function registerIconSet(name: string, data: IconSetData): void {
  iconSets.set(name, data);
}

export function iconSetData(name: string): IconSetData | undefined {
  return iconSets.get(name);
}

export function parseIconRef(ref: string): IconRef {
  const separator = ref.indexOf(':');
  if (separator === -1) return { set: null, name: ref };
  return { set: ref.slice(0, separator), name: ref.slice(separator + 1) };
}

export function isSemanticIcon(name: string): boolean {
  return SEMANTIC_ICONS[name] !== undefined;
}

export function semanticIconNames(): string[] {
  return Object.keys(SEMANTIC_ICONS);
}

export function semanticIconIn(name: string, set: string): string | undefined {
  return SEMANTIC_ICONS[name]?.[set];
}

function iconIn(set: string, name: string): ResolvedIcon | null {
  const data = iconSets.get(set);
  if (data === undefined) return null;
  const iconName = data.aliases[name] ?? name;
  const icon = data.icons[iconName];
  if (icon === undefined) return null;
  return {
    set,
    name: iconName,
    body: icon.body,
    width: icon.width ?? data.width,
    height: icon.height ?? data.height,
  };
}

function semanticIcon(name: string, set: string): ResolvedIcon | null {
  const mapped = semanticIconIn(name, set);
  return mapped === undefined ? null : iconIn(set, mapped);
}

export function resolveIcon(
  ref: string,
  defaultSet: string = DEFAULT_ICON_SET,
): ResolvedIcon | null {
  const { set, name } = parseIconRef(ref);
  if (set !== null) return iconIn(set, name);
  return (
    semanticIcon(name, defaultSet) ??
    iconIn(defaultSet, name) ??
    semanticIcon(name, DEFAULT_ICON_SET) ??
    iconIn(DEFAULT_ICON_SET, name)
  );
}

const DIRECTIONAL_ICON_NAME =
  /(?:^|-)(?:arrow|chevron|caret)(?:-[a-z]+)*-(?:left|right|forward|back)(?:-|$)/;

function iconClassName(icon: ResolvedIcon): string {
  return DIRECTIONAL_ICON_NAME.test(icon.name) ? 'icon icon-mirror' : 'icon';
}

export function iconSvg(icon: ResolvedIcon): string {
  return `<svg class="${iconClassName(icon)}" aria-hidden="true" viewBox="0 0 ${icon.width} ${icon.height}">${icon.body}</svg>`;
}

export function iconSymbolId(icon: ResolvedIcon): string {
  return `icon-${`${icon.set}-${icon.name}`.replace(NOT_ID_CHARACTERS, '-').toLowerCase()}`;
}

export function iconUse(symbolId: string, icon: ResolvedIcon): string {
  return `<svg class="${iconClassName(icon)}" aria-hidden="true" viewBox="0 0 ${icon.width} ${icon.height}"><use href="#${symbolId}"></use></svg>`;
}

export function buildIconSprite(icons: Iterable<SpriteIcon>): string | null {
  const symbols: string[] = [];
  for (const icon of icons) {
    symbols.push(
      `<symbol id="${icon.symbolId}" viewBox="0 0 ${icon.width} ${icon.height}">${icon.body}</symbol>`,
    );
  }
  if (symbols.length === 0) return null;
  symbols.sort();
  return `<svg hidden aria-hidden="true">${symbols.join('')}</svg>`;
}

function toSearchTerm(query: string): string {
  const lowerCase = query.trim().toLowerCase();
  return lowerCase.replace(WHITESPACE, '-');
}

type RankedName = { name: string; rank: number };

function matchRank(label: string, term: string): number | null {
  if (label === term) {
    return EXACT_MATCH;
  } else if (label.startsWith(term)) {
    return PREFIX_MATCH;
  } else if (label.includes(term)) {
    return PARTIAL_MATCH;
  } else {
    return null;
  }
}

const visibleNamesBySet = new WeakMap<IconSetData, Map<string, string[]>>();

function visibleNames(data: IconSetData, style: string | null): string[] {
  let byStyle = visibleNamesBySet.get(data);
  if (byStyle === undefined) {
    byStyle = new Map();
    visibleNamesBySet.set(data, byStyle);
  }
  const styleKey = style ?? '';
  const cached = byStyle.get(styleKey);
  if (cached !== undefined) return cached;
  const names: string[] = [];
  for (const [name, icon] of Object.entries(data.icons)) {
    if (icon.hidden === true) continue;
    if (style !== null && iconStyleOf(name, data.styles) !== style) continue;
    names.push(name);
  }
  byStyle.set(styleKey, names);
  return names;
}

export function searchIcons(set: string, query: string, style: string | null = null): string[] {
  const data = iconSets.get(set);
  if (data === undefined) return [];
  const term = toSearchTerm(query);
  const names = visibleNames(data, style);
  if (term === '') return [...names];

  const allowed = new Set(names);
  const bestRanks = new Map<string, number>();
  function consider(label: string, name: string): void {
    if (!allowed.has(name)) return;
    const rank = matchRank(label, term);
    if (rank === null) return;
    const previous = bestRanks.get(name);
    if (previous === undefined || rank < previous) bestRanks.set(name, rank);
  }
  for (const name of names) consider(name, name);
  for (const [alias, name] of Object.entries(data.aliases)) consider(alias, name);

  const ranked: RankedName[] = [];
  for (const [name, rank] of bestRanks) ranked.push({ name, rank });
  ranked.sort((left, right) => left.rank - right.rank);
  const rankedNames: string[] = [];
  for (const { name } of ranked) rankedNames.push(name);
  return rankedNames;
}
