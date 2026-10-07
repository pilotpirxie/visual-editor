import { describe, expect, it } from 'vitest';
import type { Token } from '../app/types';
import {
  CANVAS_BASE_CSS,
  LAYER_ORDER,
  buildSiteCss,
  buildTokensCss,
  chunkClasses,
  usedTokenNames,
} from './css';

function token(name: string, value: string): Token {
  return { name, label: name, group: 'color', value };
}

const tokens: Record<string, Token> = {
  '--color-primary': token('--color-primary', '#4f46e5'),
  '--radius-md': token('--radius-md', '0.5rem'),
  '--button-radius': token('--button-radius', 'var(--radius-md)'),
  '--color-unused': token('--color-unused', '#000000'),
};

function site(usedClasses: string[], componentStyles: string[] = [], html = '') {
  return buildSiteCss({
    tokens,
    componentStyles,
    usedClasses: new Set(usedClasses),
    htmlSources: [html],
  });
}

describe('buildTokensCss', () => {
  it('emits every token as a custom property on :root', () => {
    expect(buildTokensCss({ '--color-primary': token('--color-primary', '#4f46e5') })).toBe(
      ':root {\n  --color-primary: #4f46e5;\n}',
    );
  });
});

describe('chunkClasses', () => {
  it('lists the classes a CSS chunk styles, once each', () => {
    expect(chunkClasses('.btn { } .btn-primary:hover { } .btn > .icon { color: 0.5em }')).toEqual([
      'btn',
      'btn-primary',
      'icon',
    ]);
  });
});

describe('usedTokenNames', () => {
  it('follows references from the CSS through other tokens', () => {
    const used = usedTokenNames(['.btn { border-radius: var(--button-radius); }'], tokens);
    expect([...used].sort()).toEqual(['--button-radius', '--radius-md']);
  });
});

describe('buildSiteCss', () => {
  it('starts with the tokens, then declares the layer order before any layered rules', () => {
    const { css } = site([]);
    expect(css.startsWith(':root {')).toBe(true);
    expect(css.indexOf(LAYER_ORDER)).toBeLessThan(css.indexOf('@layer reset {'));
  });

  it('ships only the primitives and utilities whose classes the pages use', () => {
    const { css, omittedPrimitives } = site(['btn', 'btn-primary', 'hide-phone']);
    expect(css).toContain('.btn-primary');
    expect(css).toContain('.hide-phone');
    expect(css).not.toContain('.card {');
    expect(css).not.toContain('.visually-hidden');
    expect(omittedPrimitives).toContain('card');
    expect(omittedPrimitives).not.toContain('btn');
  });

  it('places component CSS between primitives and utilities', () => {
    const component = '@layer components { @scope (.b-test) { :scope { color: red; } } }';
    const { css } = site(['container', 'hide-phone'], [component]);
    expect(css).toContain(component);
    expect(css.indexOf('@layer primitives {')).toBeLessThan(css.indexOf(component));
    expect(css.indexOf(component)).toBeLessThan(css.indexOf('@layer utilities {'));
  });

  it('ships only tokens the CSS or the inline overrides reference', () => {
    const { css } = site([], [], '<section style="--color-background: var(--color-primary)">');
    expect(css).toContain('--color-primary: #4f46e5;');
    expect(css).not.toContain('--color-unused');
  });
});

describe('CANVAS_BASE_CSS', () => {
  it('holds every primitive and utility so any block renders on the canvas', () => {
    for (const selector of ['.container', '.btn-ghost', '.prose', '.icon', '.visually-hidden']) {
      expect(CANVAS_BASE_CSS).toContain(selector);
    }
  });
});
