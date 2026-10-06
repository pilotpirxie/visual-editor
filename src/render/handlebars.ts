import Handlebars from 'handlebars/runtime';
import type { HelperOptions } from 'handlebars';
import { isImageValue } from '../components/fields';
import type { LinkValue } from '../components/types';
import { iconSvg, resolveIcon } from './icons';
import { placeholderDataUrl } from './placeholder';
import { isSafeImageSrc, isSafeUrl } from './sanitize';

export type RenderData = { pageSlugs: Record<string, string>; eagerImages?: boolean };

export function resolveHref(link: LinkValue | undefined, data: RenderData): string {
  if (!link) return '#';
  const page = link.pageId ? data.pageSlugs[link.pageId] : undefined;
  switch (link.type) {
    case 'page':
      return page ? `${page}.html` : '#';
    case 'section':
      return `${page ? `${page}.html` : ''}#${link.anchor ?? ''}`;
    case 'email':
      return `mailto:${link.url ?? ''}`;
    case 'phone':
      return `tel:${link.url ?? ''}`;
    case 'url':
      return !link.url || !isSafeUrl(link.url) ? '#' : link.url;
    default: {
      const unknownType: never = link.type;
      throw new Error(`Unknown link type "${String(unknownType)}"`);
    }
  }
}

Handlebars.registerHelper({
  href: (link: LinkValue, options: HelperOptions) => resolveHref(link, options.data),
  linkAttrs: (link: LinkValue | undefined) =>
    new Handlebars.SafeString(link?.newTab ? 'target="_blank" rel="noopener"' : ''),
  svgIcon: (ref: unknown) => {
    const icon = typeof ref === 'string' ? resolveIcon(ref) : null;
    if (icon === null) {
      console.warn(`svgIcon: unknown icon "${String(ref)}"`);
      return '';
    }
    return new Handlebars.SafeString(iconSvg(icon));
  },
  img: (image: unknown, options: HelperOptions) => {
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
    const attributes = [
      `src="${escape(src)}"`,
      `alt="${escape(image.decorative ? '' : image.alt)}"`,
      `width="${image.width}"`,
      `height="${image.height}"`,
    ];
    const className: unknown = options.hash.class;
    if (typeof className === 'string' && className !== '') {
      attributes.push(`class="${escape(className)}"`);
    }
    const data: RenderData = options.data;
    if (data.eagerImages) attributes.push('loading="eager"', 'fetchpriority="high"');
    else attributes.push('loading="lazy"');
    return new Handlebars.SafeString(`<img ${attributes.join(' ')}>`);
  },
  eq: (left: unknown, right: unknown) => left === right,
  not: (value: unknown) => !value,
  and: (left: unknown, right: unknown) => Boolean(left) && Boolean(right),
  or: (left: unknown, right: unknown) => Boolean(left) || Boolean(right),
  nl2br: (text: unknown) =>
    new Handlebars.SafeString(
      Handlebars.escapeExpression(typeof text === 'string' ? text : '').replace(/\r?\n/g, '<br>'),
    ),
});
