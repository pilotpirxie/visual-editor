import Handlebars from 'handlebars/runtime';
import type { HelperOptions } from 'handlebars';
import { isImageValue } from '../components/fields';
import type { LinkValue } from '../components/types';
import {
  DEFAULT_ICON_SET,
  iconSetData,
  iconSvg,
  iconSymbolId,
  iconUse,
  parseIconRef,
  resolveIcon,
  type SpriteIcon,
} from './icons';
import { placeholderDataUrl, placeholderFileName, type Placeholder } from './placeholder';
import { isSafeImageSrc, isSafeUrl, normalizeRichText } from './sanitize';

export type RenderCollector = {
  icons: Map<string, SpriteIcon>;
  iconSets: Set<string>;
  images: Map<string, Placeholder>;
};

export type RenderData = {
  pageSlugs: Record<string, string>;
  currentPageId?: string | null;
  eagerImages?: boolean;
  iconSet?: string;
  language?: string;
  collector?: RenderCollector;
};

export function createRenderCollector(): RenderCollector {
  return { icons: new Map(), iconSets: new Set(), images: new Map() };
}

const NEW_TAB_ATTRIBUTES = 'target="_blank" rel="noopener"';

export const PLACEHOLDER_FOLDER = 'assets/images';
const LINE_BREAK = /\r?\n/g;

function pageFileOf(link: LinkValue, data: RenderData): string {
  if (link.pageId === undefined) return '';
  const slug = data.pageSlugs[link.pageId];
  if (slug === undefined || slug === '') return '';
  return `${slug}.html`;
}

export function resolveHref(link: LinkValue | undefined, data: RenderData): string {
  if (link === undefined) return '#';
  const pageFile = pageFileOf(link, data);
  switch (link.type) {
    case 'page':
      return pageFile === '' ? '#' : pageFile;
    case 'section': {
      const anchor = encodeURIComponent(link.anchor ?? '');
      const isSamePage = link.pageId === undefined || link.pageId === data.currentPageId;
      if (isSamePage) return anchor === '' ? '#' : `#${anchor}`;
      if (pageFile === '') return '#';
      return anchor === '' ? pageFile : `${pageFile}#${anchor}`;
    }
    case 'email':
      return `mailto:${link.url ?? ''}`;
    case 'phone':
      return `tel:${link.url ?? ''}`;
    case 'url': {
      const url = link.url ?? '';
      const isUsable = url !== '' && isSafeUrl(url);
      return isUsable ? url : '#';
    }
    default: {
      const unknownType: never = link.type;
      throw new Error(`Unknown link type "${String(unknownType)}"`);
    }
  }
}

function isRenderData(value: unknown): value is RenderData {
  if (typeof value !== 'object' || value === null || !('pageSlugs' in value)) return false;
  return typeof value.pageSlugs === 'object' && value.pageSlugs !== null;
}

function renderDataOf(options: HelperOptions): RenderData {
  const data: unknown = options.data;
  if (!isRenderData(data)) throw new Error('A block template was rendered without page data');
  return data;
}

function textOrEmpty(value: unknown): string {
  if (typeof value === 'string') return value;
  return '';
}

function hrefHelper(link: LinkValue | undefined, options: HelperOptions): string {
  return resolveHref(link, renderDataOf(options));
}

function linkAttrsHelper(link: LinkValue | undefined): Handlebars.SafeString {
  if (link?.newTab === true) return new Handlebars.SafeString(NEW_TAB_ATTRIBUTES);
  return new Handlebars.SafeString('');
}

function svgIconHelper(ref: unknown, options: HelperOptions): Handlebars.SafeString | string {
  const data = renderDataOf(options);
  const icon = typeof ref === 'string' ? resolveIcon(ref, data.iconSet) : null;
  if (icon === null) {
    if (typeof ref === 'string' && !isIconSetReady(ref, data.iconSet)) return '';
    console.warn(`svgIcon: unknown icon "${String(ref)}"`);
    return '';
  }
  const { collector } = data;
  if (collector === undefined) return new Handlebars.SafeString(iconSvg(icon));
  const symbolId = iconSymbolId(icon);
  collector.icons.set(symbolId, { ...icon, symbolId });
  collector.iconSets.add(icon.set);
  return new Handlebars.SafeString(iconUse(symbolId, icon));
}

function isIconSetReady(ref: string, defaultSet: string | undefined): boolean {
  const set = parseIconRef(ref).set ?? defaultSet ?? DEFAULT_ICON_SET;
  return iconSetData(set) !== undefined;
}

function imgHelper(image: unknown, options: HelperOptions): Handlebars.SafeString | string {
  if (!isImageValue(image)) {
    console.warn('img: expected an image value', image);
    return '';
  }
  const escape = Handlebars.escapeExpression;
  const { collector } = renderDataOf(options);
  let src = image.src;
  if (image.source === 'placeholder' && collector === undefined) {
    src = placeholderDataUrl(image.placeholder);
  } else if (image.source === 'placeholder' && collector !== undefined) {
    src = `${PLACEHOLDER_FOLDER}/${placeholderFileName(image.placeholder)}`;
    collector.images.set(src, image.placeholder);
  }
  if (!isSafeImageSrc(src)) {
    console.warn(`img: blocked an unsafe image source "${src}"`);
    return '';
  }
  const alt = image.decorative ? '' : image.alt;
  const attributes = [
    `src="${escape(src)}"`,
    `alt="${escape(alt)}"`,
    `width="${image.width}"`,
    `height="${image.height}"`,
  ];
  const className: unknown = options.hash.class;
  if (typeof className === 'string' && className !== '') {
    attributes.push(`class="${escape(className)}"`);
  }
  if (renderDataOf(options).eagerImages === true) {
    attributes.push('loading="eager"', 'fetchpriority="high"');
  } else {
    attributes.push('loading="lazy"');
  }
  return new Handlebars.SafeString(`<img ${attributes.join(' ')}>`);
}

function richTextHelper(html: unknown, options: HelperOptions): Handlebars.SafeString {
  const allowHeadings = options.hash.headings === true;
  return new Handlebars.SafeString(normalizeRichText(textOrEmpty(html), { allowHeadings }));
}

function safeUrlHelper(url: unknown): string {
  const text = textOrEmpty(url).trim();
  return text !== '' && isSafeUrl(text) ? text : '';
}

const DEFAULT_LANGUAGE = 'en';
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function dateFormatter(language: string): Intl.DateTimeFormat {
  const options: Intl.DateTimeFormatOptions = { dateStyle: 'long', timeZone: 'UTC' };
  try {
    return new Intl.DateTimeFormat(language, options);
  } catch (error) {
    console.warn(`formatDate: unknown language "${language}", using ${DEFAULT_LANGUAGE}`, error);
    return new Intl.DateTimeFormat(DEFAULT_LANGUAGE, options);
  }
}

function formatDateHelper(date: unknown, options: HelperOptions): string {
  const text = textOrEmpty(date);
  if (!ISO_DATE.test(text)) return text;
  const parsed = new Date(`${text}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return text;
  const language = renderDataOf(options).language ?? DEFAULT_LANGUAGE;
  return dateFormatter(language).format(parsed);
}

function nl2brHelper(text: unknown): Handlebars.SafeString {
  const escaped = Handlebars.escapeExpression(textOrEmpty(text));
  return new Handlebars.SafeString(escaped.replace(LINE_BREAK, '<br>'));
}

Handlebars.registerHelper({
  href: hrefHelper,
  linkAttrs: linkAttrsHelper,
  svgIcon: svgIconHelper,
  img: imgHelper,
  eq: (left: unknown, right: unknown) => left === right,
  not: (value: unknown) => !value,
  and: (left: unknown, right: unknown) => Boolean(left) && Boolean(right),
  or: (left: unknown, right: unknown) => Boolean(left) || Boolean(right),
  richText: richTextHelper,
  nl2br: nl2brHelper,
  safeUrl: safeUrlHelper,
  formatDate: formatDateHelper,
});
