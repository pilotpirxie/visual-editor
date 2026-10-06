import type { IconSetData } from '../../packages/icon-data/src/convert';

export type ResolvedIcon = { body: string; width: number; height: number };

export type IconRef = { set: string; name: string };

export const DEFAULT_ICON_SET = 'lucide';

const EXACT_MATCH = 0;
const PREFIX_MATCH = 1;
const PARTIAL_MATCH = 2;

const iconSets = new Map<string, IconSetData>();

export function registerIconSet(name: string, data: IconSetData): void {
  iconSets.set(name, data);
}

export function parseIconRef(ref: string): IconRef {
  const separator = ref.indexOf(':');
  if (separator === -1) return { set: DEFAULT_ICON_SET, name: ref };
  return { set: ref.slice(0, separator), name: ref.slice(separator + 1) };
}

export function resolveIcon(ref: string): ResolvedIcon | null {
  const { set, name } = parseIconRef(ref);
  const data = iconSets.get(set);
  if (data === undefined) return null;
  const icon = data.icons[data.aliases[name] ?? name];
  if (icon === undefined) return null;
  return {
    body: icon.body,
    width: icon.width ?? data.width,
    height: icon.height ?? data.height,
  };
}

export function iconSvg(icon: ResolvedIcon): string {
  return `<svg class="icon" aria-hidden="true" viewBox="0 0 ${icon.width} ${icon.height}">${icon.body}</svg>`;
}

const WHITESPACE = /\s+/g;

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

export function searchIcons(set: string, query: string): string[] {
  const data = iconSets.get(set);
  if (data === undefined) return [];
  const term = toSearchTerm(query);
  const names: string[] = [];
  for (const [name, icon] of Object.entries(data.icons)) {
    if (icon.hidden !== true) names.push(name);
  }
  if (term === '') return names;

  const bestRanks = new Map<string, number>();
  function consider(label: string, name: string): void {
    const rank = matchRank(label, term);
    if (rank === null) return;
    const previous = bestRanks.get(name);
    if (previous === undefined || rank < previous) bestRanks.set(name, rank);
  }
  for (const name of names) consider(name, name);
  for (const [alias, name] of Object.entries(data.aliases)) {
    if (data.icons[name]?.hidden !== true) consider(alias, name);
  }

  const ranked: RankedName[] = [];
  for (const [name, rank] of bestRanks) ranked.push({ name, rank });
  ranked.sort((left, right) => left.rank - right.rank);
  const rankedNames: string[] = [];
  for (const { name } of ranked) rankedNames.push(name);
  return rankedNames;
}
