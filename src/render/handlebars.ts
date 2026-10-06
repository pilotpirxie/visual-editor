import Handlebars from 'handlebars/runtime';
import type { HelperOptions } from 'handlebars';
import type { LinkValue } from '../components/types';
import { ICONS, iconSvg } from './icons';

export type RenderData = { pageSlugs: Record<string, string> };

const UNSAFE_URL = /^\s*javascript:/i;

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
      return !link.url || UNSAFE_URL.test(link.url) ? '#' : link.url;
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
    const name = typeof ref === 'string' ? ref.slice(ref.indexOf(':') + 1) : '';
    const body = ICONS[name];
    if (!body) {
      console.warn(`svgIcon: unknown icon "${String(ref)}"`);
      return '';
    }
    return new Handlebars.SafeString(iconSvg(body));
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
