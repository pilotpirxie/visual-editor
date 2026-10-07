import type { FontRole, Token } from './types';

export const WEIGHT_TOKENS: Record<FontRole, readonly string[]> = {
  heading: ['--font-weight-heading'],
  body: ['--font-weight-regular', '--font-weight-bold'],
};

export const SYSTEM_FONT_WEIGHTS: readonly number[] = [100, 200, 300, 400, 500, 600, 700, 800, 900];

function tokenWeight(tokens: Record<string, Token>, name: string): number | null {
  const weight = Number(tokens[name]?.value);
  if (!Number.isInteger(weight)) return null;
  return weight;
}

export function derivedFontWeights(role: FontRole, tokens: Record<string, Token>): number[] {
  const weights: number[] = [];
  for (const name of WEIGHT_TOKENS[role]) {
    const weight = tokenWeight(tokens, name);
    if (weight !== null && !weights.includes(weight)) weights.push(weight);
  }
  weights.sort((left, right) => left - right);
  return weights;
}

export function nearestWeight(wanted: number, available: readonly number[]): number {
  let nearest = available[0];
  if (nearest === undefined) return wanted;
  for (const weight of available) {
    if (Math.abs(weight - wanted) < Math.abs(nearest - wanted)) nearest = weight;
  }
  return nearest;
}
