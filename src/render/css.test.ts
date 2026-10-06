import { describe, expect, it } from 'vitest';
import type { Token } from '../app/types';
import { LAYER_ORDER, buildSiteCss, buildTokensCss } from './css';

const tokens: Record<string, Token> = {
  '--color-primary': {
    name: '--color-primary',
    label: 'Primary',
    group: 'color',
    value: '#4f46e5',
  },
  '--button-radius': {
    name: '--button-radius',
    label: 'Button radius',
    group: 'component',
    value: 'var(--radius-md)',
  },
};

describe('buildTokensCss', () => {
  it('emits every token as a custom property on :root', () => {
    expect(buildTokensCss(tokens)).toBe(
      ':root {\n  --color-primary: #4f46e5;\n  --button-radius: var(--radius-md);\n}',
    );
  });
});

describe('buildSiteCss', () => {
  it('starts with the tokens, then declares the layer order before any layered rules', () => {
    const css = buildSiteCss(tokens, []);
    expect(css.startsWith(':root {')).toBe(true);
    expect(css.indexOf(LAYER_ORDER)).toBeLessThan(css.indexOf('@layer reset {'));
  });

  it('includes exactly the component CSS it is given, between primitives and utilities', () => {
    const component = '@layer components { @scope (.b-test) { :scope { color: red; } } }';
    const css = buildSiteCss(tokens, [component]);
    expect(css).toContain(component);
    expect(css.indexOf('@layer primitives {')).toBeLessThan(css.indexOf(component));
    expect(css.indexOf(component)).toBeLessThan(css.indexOf('@layer utilities {'));
  });
});
