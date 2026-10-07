import type { FontCategory } from '../../packages/font-data/src/convert';
import type { FontRole, FontSelection } from '../app/types';

const GOOGLE_FONTS_CSS = 'https://fonts.googleapis.com/css2';
const SYSTEM_SANS = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
const UNSAFE_FAMILY_CHARACTERS = /["\\;{}<>]/g;
const ENCODED_SPACE = /%20/g;

const FALLBACK_STACKS: Record<FontCategory, string> = {
  'sans-serif': 'system-ui, sans-serif',
  serif: 'ui-serif, Georgia, serif',
  display: 'system-ui, sans-serif',
  handwriting: 'cursive',
  monospace: 'ui-monospace, monospace',
};

export const SYSTEM_FONT_STACKS: Record<FontRole, string> = {
  heading: SYSTEM_SANS,
  body: SYSTEM_SANS,
};

function safeFamily(family: string): string {
  return family.replace(UNSAFE_FAMILY_CHARACTERS, '');
}

function encodeFamily(family: string): string {
  return encodeURIComponent(safeFamily(family)).replace(ENCODED_SPACE, '+');
}

export function fontStack(family: string, category: FontCategory): string {
  return `"${safeFamily(family)}", ${FALLBACK_STACKS[category]}`;
}

export function googleFontsHref(fonts: FontSelection[]): string | null {
  const weightsByFamily = new Map<string, Set<number>>();
  for (const { family, weights } of fonts) {
    const merged = weightsByFamily.get(family) ?? new Set<number>();
    for (const weight of weights) merged.add(weight);
    weightsByFamily.set(family, merged);
  }
  if (weightsByFamily.size === 0) return null;
  const families = [...weightsByFamily.keys()];
  families.sort();
  const params: string[] = [];
  for (const family of families) {
    const weights = [...(weightsByFamily.get(family) ?? [])];
    weights.sort((left, right) => left - right);
    const axis = weights.length === 0 ? '' : `:wght@${weights.join(';')}`;
    params.push(`family=${encodeFamily(family)}${axis}`);
  }
  return `${GOOGLE_FONTS_CSS}?${params.join('&')}&display=swap`;
}

export function previewFontHref(family: string, weight: number): string {
  const text = encodeURIComponent(safeFamily(family));
  return `${GOOGLE_FONTS_CSS}?family=${encodeFamily(family)}:wght@${weight}&text=${text}&display=swap`;
}
