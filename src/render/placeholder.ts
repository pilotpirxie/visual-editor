import type { ImageValue, PlaceholderRatio, PlaceholderSubject } from '../components/types';

type Placeholder = ImageValue['placeholder'];

const LONG_EDGE_PX = 1200;
const GLYPH_SHARE = 0.16;
const LABEL_SHARE = 0.045;
const GLYPH_VIEWBOX = 24;
const BACKGROUND_COLOR = '#e5e7eb';
const GLYPH_COLOR = '#9ca3af';
const LABEL_COLOR = '#6b7280';
const GLYPH_STROKE_WIDTH = 1.5;
const RATIO_PATTERN = /^(?<width>\d+):(?<height>\d+)$/;

const SUBJECT_GLYPHS: Record<PlaceholderSubject, string> = {
  photo:
    '<rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>',
  person: '<circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 0 0-16 0"/>',
  product:
    '<path d="M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z"/><path d="M12 22V12"/><path d="m3.3 7 8.7 5 8.7-5"/>',
  logo: '<path d="M12 2 2 7l10 5 10-5-10-5Z"/><path d="m2 17 10 5 10-5"/><path d="m2 12 10 5 10-5"/>',
  screenshot:
    '<rect width="20" height="14" x="2" y="3" rx="2"/><path d="M8 21h8"/><path d="M12 17v4"/>',
};

export function placeholderSize(ratio: PlaceholderRatio): { width: number; height: number } {
  const groups = RATIO_PATTERN.exec(ratio)?.groups;
  if (groups === undefined) throw new Error(`Placeholder ratio "${ratio}" is not in the form W:H`);
  const ratioWidth = Number(groups.width);
  const ratioHeight = Number(groups.height);
  if (ratioWidth >= ratioHeight) {
    return { width: LONG_EDGE_PX, height: Math.round((LONG_EDGE_PX * ratioHeight) / ratioWidth) };
  }
  return { width: Math.round((LONG_EDGE_PX * ratioWidth) / ratioHeight), height: LONG_EDGE_PX };
}

export function placeholderImage(
  placeholder: Placeholder,
  alt: string,
  decorative = false,
): ImageValue {
  return {
    source: 'placeholder',
    src: '',
    alt,
    decorative,
    ...placeholderSize(placeholder.ratio),
    placeholder,
  };
}

export function placeholderSvg({ ratio, subject }: Placeholder): string {
  const { width, height } = placeholderSize(ratio);
  const shortEdge = Math.min(width, height);
  const glyphSize = Math.round(shortEdge * GLYPH_SHARE);
  const fontSize = Math.round(shortEdge * LABEL_SHARE);
  const glyphX = Math.round((width - glyphSize) / 2);
  const glyphY = Math.round((height - glyphSize) / 2 - fontSize);
  const labelY = glyphY + glyphSize + fontSize * 2;
  const scale = glyphSize / GLYPH_VIEWBOX;
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    `<rect width="100%" height="100%" fill="${BACKGROUND_COLOR}"/>`,
    `<g transform="translate(${glyphX} ${glyphY}) scale(${scale})" fill="none" stroke="${GLYPH_COLOR}" stroke-width="${GLYPH_STROKE_WIDTH}" stroke-linecap="round" stroke-linejoin="round">${SUBJECT_GLYPHS[subject]}</g>`,
    `<text x="50%" y="${labelY}" text-anchor="middle" font-family="system-ui, sans-serif" font-size="${fontSize}" fill="${LABEL_COLOR}">${width} × ${height}</text>`,
    '</svg>',
  ].join('');
}

export function placeholderDataUrl(placeholder: Placeholder): string {
  return `data:image/svg+xml,${encodeURIComponent(placeholderSvg(placeholder))}`;
}
