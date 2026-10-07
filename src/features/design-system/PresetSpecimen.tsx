import type { JSX } from 'react';
import { selectCanvasDesignSystem, useStore } from '../../app/store';
import { escapeHtml } from '../../render/attributes';
import { buildTokensCss, CANVAS_BASE_CSS } from '../../render/css';
import { googleFontsHref } from '../../render/fonts';

const SWATCH_TOKENS = [
  '--color-primary',
  '--color-background',
  '--color-surface',
  '--color-text',
  '--color-text-muted',
  '--color-border',
];

const SPECIMEN_MARKUP = [
  '<div class="container stack" style="--stack-gap: var(--space-6); padding-block: var(--space-6)">',
  '<div class="stack"><p class="eyebrow">Eyebrow</p><h1>Heading one</h1><h2>Heading two</h2><h3>Heading three</h3>',
  '<p>Body text reads comfortably at this size, with room to breathe between lines.</p>',
  '<p style="color: var(--color-text-muted)">Muted text for captions and helper copy.</p></div>',
  '<div class="cluster">',
  ...SWATCH_TOKENS.map(
    (token) =>
      `<span title="${token}" style="width: 2.5rem; height: 2.5rem; border-radius: var(--radius-md); border: var(--border-width) solid var(--color-border); background: var(${token})"></span>`,
  ),
  '</div>',
  '<div class="cluster"><a class="btn btn-primary" href="#">Primary</a><a class="btn btn-secondary" href="#">Secondary</a><a class="btn btn-ghost" href="#">Ghost</a><span class="badge">Badge</span></div>',
  '<article class="card stack"><h3>Card title</h3><p>Cards use the card radius and shadow tokens.</p></article>',
  '<div class="field"><label for="specimen-email">Email</label><input id="specimen-email" placeholder="you@example.com"><p class="field-hint">Form fields follow the same tokens.</p></div>',
  '</div>',
].join('');

export function PresetSpecimen(): JSX.Element {
  const designSystem = useStore(selectCanvasDesignSystem);
  const fontsHref = googleFontsHref(designSystem.fonts);
  const fontsLink =
    fontsHref === null ? '' : `<link rel="stylesheet" href="${escapeHtml(fontsHref)}">`;
  const html = [
    '<!doctype html><html><head><meta charset="utf-8">',
    fontsLink,
    `<style>${CANVAS_BASE_CSS}\n${buildTokensCss(designSystem.tokens)}</style>`,
    `</head><body>${SPECIMEN_MARKUP}</body></html>`,
  ].join('');
  return <iframe className="ve-specimen" title="Design system specimen" sandbox="" srcDoc={html} />;
}
