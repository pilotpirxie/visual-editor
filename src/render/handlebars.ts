import Handlebars from 'handlebars/runtime';
import type { HelperOptions } from 'handlebars';
import { isImageValue } from '../components/fields';
import type { LinkValue } from '../components/types';
import { iconSvg, resolveIcon } from './icons';
import { placeholderDataUrl } from './placeholder';
import { isSafeImageSrc, isSafeUrl, normalizeRichText } from './sanitize';

export type RenderData = { pageSlugs: Record<string, string>; eagerImages?: boolean };

const NEW_TAB_ATTRIBUTES = 'target="_blank" rel="noopener"';
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
    case 'section':
      return `${pageFile}#${link.anchor ?? ''}`;
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

function svgIconHelper(ref: unknown): Handlebars.SafeString | string {
  const icon = typeof ref === 'string' ? resolveIcon(ref) : null;
  if (icon === null) {
    console.warn(`svgIcon: unknown icon "${String(ref)}"`);
    return '';
  }
  return new Handlebars.SafeString(iconSvg(icon));
}

function imgHelper(image: unknown, options: HelperOptions): Handlebars.SafeString | string {
  if (!isImageValue(image)) {
    console.warn('img: expected an image value', image);
    return '';
  }
  const escape = Handlebars.escapeExpression;
  const src = image.source === 'placeholder' ? placeholderDataUrl(image.placeholder) : image.src;
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

function richTextHelper(html: unknown): Handlebars.SafeString {
  return new Handlebars.SafeString(normalizeRichText(textOrEmpty(html)));
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
});
