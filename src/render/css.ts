import type { Token } from '../app/types';
import base from './styles/base.css?raw';
import primitives from './styles/primitives.css?raw';
import reset from './styles/reset.css?raw';
import utilities from './styles/utilities.css?raw';

export const LAYER_ORDER = '@layer reset, base, primitives, components, utilities;';

export const CANVAS_BASE_CSS = [LAYER_ORDER, reset, base, primitives, utilities].join('\n\n');

export function buildTokensCss(tokens: Record<string, Token>): string {
  const declarations = Object.values(tokens).map((token) => `  ${token.name}: ${token.value};`);
  return `:root {\n${declarations.join('\n')}\n}`;
}

export function buildSiteCss(tokens: Record<string, Token>, componentStyles: string[]): string {
  const sections = [
    buildTokensCss(tokens),
    LAYER_ORDER,
    reset,
    base,
    primitives,
    ...componentStyles,
    utilities,
  ];
  return `${sections.join('\n\n')}\n`;
}
