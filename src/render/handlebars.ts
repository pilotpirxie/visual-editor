import Handlebars from 'handlebars/runtime';
import type { HelperOptions } from 'handlebars';
import { formspreeId, formTargetError } from '../app/settingsRules';
import { slugify } from '../app/slugs';
import type { SiteMeta } from '../app/types';
import { isImageValue, isLinkValue } from '../components/fields';
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
import { IMAGES_FOLDER } from './pageHead';
import { placeholderDataUrl, placeholderFileName, type Placeholder } from './placeholder';
import { isSafeImageSrc, isSafeUrl, normalizeRichText } from './sanitize';
import { cachedByText, hashText } from './textCache';

export type RenderCollector = {
  icons: Map<string, SpriteIcon>;
  iconSets: Set<string>;
  images: Map<string, Placeholder>;
  uploads: Map<string, string>;
};

export type SiteForm = { service: 'netlify' } | { service: 'address'; action: string };

export type RenderData = {
  pageSlugs: Record<string, string>;
  siteForm?: SiteForm | null;
  formName?: string;
  currentPageId?: string | null;
  eagerImages?: boolean;
  iconSet?: string;
  language?: string;
  collector?: RenderCollector;
  liveMaps?: boolean;
};

export function createRenderCollector(): RenderCollector {
  return { icons: new Map(), iconSets: new Set(), images: new Map(), uploads: new Map() };
}

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

const UPLOAD_HASH_CACHE_SIZE = 20;
const FILE_EXTENSION = /\.[a-z0-9]+$/i;
const DATA_URL_SUBTYPE = /^data:image\/(?<subtype>[a-z]+);/;

const contentHashOf = cachedByText(UPLOAD_HASH_CACHE_SIZE, hashText);

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
    src = `${IMAGES_FOLDER}/${placeholderFileName(image.placeholder)}`;
    collector.images.set(src, image.placeholder);
  } else if (image.source === 'upload' && collector !== undefined) {
    const extension = DATA_URL_SUBTYPE.exec(image.src)?.groups?.subtype ?? 'bin';
    const baseName = slugify(image.name.replace(FILE_EXTENSION, ''));
    src = `${IMAGES_FOLDER}/${baseName}-${contentHashOf(image.src)}.${extension}`;
    collector.uploads.set(src, image.src);
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

const VIDEO_ID = /^[\w-]{3,40}$/;
const SITE_PREFIX = /^(?:www|m)\./;
const YOUTUBE_PLAYER_PATHS = ['embed', 'shorts', 'live'];

function youTubeVideoId(url: URL, segments: string[]): string | null {
  const [first, second] = segments;
  if (first === 'watch') return url.searchParams.get('v');
  if (first !== undefined && YOUTUBE_PLAYER_PATHS.includes(first)) return second ?? null;
  return null;
}

export function videoEmbedUrl(address: string): string | null {
  const trimmed = address.trim();
  if (!URL.canParse(trimmed)) return null;
  const url = new URL(trimmed);
  const host = url.hostname.replace(SITE_PREFIX, '');
  const segments = url.pathname.split('/').filter((segment) => segment !== '');
  let id: string | null = null;
  let player = '';
  if (host === 'youtu.be') {
    id = segments[0] ?? null;
    player = 'https://www.youtube-nocookie.com/embed/';
  } else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    id = youTubeVideoId(url, segments);
    player = 'https://www.youtube-nocookie.com/embed/';
  } else if (host === 'vimeo.com' || host === 'player.vimeo.com') {
    id = segments.at(-1) ?? null;
    player = 'https://player.vimeo.com/video/';
  }
  if (url.protocol !== 'https:' || id === null || !VIDEO_ID.test(id)) return null;
  return `${player}${id}?autoplay=1`;
}

function embedUrlHelper(link: unknown): string {
  if (!isLinkValue(link) || link.type !== 'url') return '';
  return videoEmbedUrl(link.url ?? '') ?? '';
}

const FORMSPREE_FORMS = 'https://formspree.io/f/';

export function siteFormOf(
  formService: SiteMeta['formService'],
  formTarget: SiteMeta['formTarget'],
): SiteForm | null {
  if (formService === undefined) return null;
  if (formService === 'netlify') return { service: 'netlify' };
  const target = formTarget?.trim() ?? '';
  if (target === '' || formTargetError(formService, target) !== null) return null;
  if (formService === 'formspree') {
    return { service: 'address', action: `${FORMSPREE_FORMS}${formspreeId(target)}` };
  }
  return isSafeUrl(target) ? { service: 'address', action: target } : null;
}

const NO_FORM_TARGET = 'method="dialog"';
const DEFAULT_FORM_NAME = 'contact';

function formAttrsHelper(
  action: unknown,
  method: unknown,
  options: HelperOptions,
): Handlebars.SafeString {
  const escape = Handlebars.escapeExpression;
  const ownAction = safeUrlHelper(action);
  if (ownAction !== '') {
    const ownMethod = method === 'get' ? 'get' : 'post';
    return new Handlebars.SafeString(`action="${escape(ownAction)}" method="${ownMethod}"`);
  }
  const { siteForm, formName } = renderDataOf(options);
  if (siteForm === undefined || siteForm === null) return new Handlebars.SafeString(NO_FORM_TARGET);
  if (siteForm.service === 'netlify') {
    const name = escape(formName ?? DEFAULT_FORM_NAME);
    return new Handlebars.SafeString(`method="post" data-netlify="true" name="${name}"`);
  }
  return new Handlebars.SafeString(`action="${escape(siteForm.action)}" method="post"`);
}

const DEFAULT_LANGUAGE = 'en';
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const dateFormatters = new Map<string, Intl.DateTimeFormat>();

function createDateFormatter(language: string): Intl.DateTimeFormat {
  const options: Intl.DateTimeFormatOptions = { dateStyle: 'long', timeZone: 'UTC' };
  try {
    return new Intl.DateTimeFormat(language, options);
  } catch (error) {
    console.warn(`formatDate: unknown language "${language}", using ${DEFAULT_LANGUAGE}`, error);
    return new Intl.DateTimeFormat(DEFAULT_LANGUAGE, options);
  }
}

function dateFormatter(language: string): Intl.DateTimeFormat {
  let formatter = dateFormatters.get(language);
  if (formatter === undefined) {
    formatter = createDateFormatter(language);
    dateFormatters.set(language, formatter);
  }
  return formatter;
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

export const MAP_SERVICE_FIELD = 'mapService';
export const MAP_SETTING_FIELDS: readonly string[] = [
  MAP_SERVICE_FIELD,
  'mapLatitude',
  'mapLongitude',
  'mapZoom',
  'mapKey',
];
export const MAP_SERVICE_NAMES: Record<string, string> = {
  google: 'Google Maps',
  osm: 'OpenStreetMap',
};

const MIN_MAP_ZOOM = 3;
const MAX_MAP_ZOOM = 19;
const DEFAULT_MAP_ZOOM = 15;
const MAX_LATITUDE = 85;
const MAX_LONGITUDE = 180;
const FULL_TURN = 360;
const HALF_TURN = 180;
const MAP_TILES_ACROSS = 2.5;
const MAP_HEIGHT_SHARE = 0.6;
const COORDINATE_DIGITS = 5;
const WHITE_SPACE = /\s+/g;
const MAP_NOTE = 'The map shows in Preview and on the exported site.';

function numberOrNull(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string' || value.trim() === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function mapZoom(value: unknown): number {
  const zoom = Math.round(numberOrNull(value) ?? DEFAULT_MAP_ZOOM);
  return Math.min(MAX_MAP_ZOOM, Math.max(MIN_MAP_ZOOM, zoom));
}

function googleMapUrl(address: string, zoom: number, key: string): string {
  const place = encodeURIComponent(address);
  if (key === '') return `https://www.google.com/maps?q=${place}&z=${zoom}&output=embed`;
  const apiKey = encodeURIComponent(key);
  return `https://www.google.com/maps/embed/v1/place?key=${apiKey}&q=${place}&zoom=${zoom}`;
}

function openStreetMapUrl(latitude: number, longitude: number, zoom: number): string {
  const halfWidth = ((FULL_TURN / 2 ** zoom) * MAP_TILES_ACROSS) / 2;
  const squeeze = Math.cos((latitude * Math.PI) / HALF_TURN);
  const halfHeight = halfWidth * MAP_HEIGHT_SHARE * squeeze;
  const corners = [
    longitude - halfWidth,
    latitude - halfHeight,
    longitude + halfWidth,
    latitude + halfHeight,
  ];
  const box = corners.map((corner) => corner.toFixed(COORDINATE_DIGITS)).join(',');
  const marker = `${latitude.toFixed(COORDINATE_DIGITS)},${longitude.toFixed(COORDINATE_DIGITS)}`;
  const query = `bbox=${encodeURIComponent(box)}&layer=mapnik&marker=${encodeURIComponent(marker)}`;
  return `https://www.openstreetmap.org/export/embed.html?${query}`;
}

function mapPlace(address: unknown, options: HelperOptions): { url: string; label: string } | null {
  const { hash } = options;
  const zoom = mapZoom(hash.zoom);
  const label = textOrEmpty(address).trim().replace(WHITE_SPACE, ' ');
  if (hash.service !== 'osm') {
    if (label === '') return null;
    return { url: googleMapUrl(label, zoom, textOrEmpty(hash.key).trim()), label };
  }
  const latitude = numberOrNull(hash.latitude);
  const longitude = numberOrNull(hash.longitude);
  if (latitude === null || longitude === null) return null;
  if (Math.abs(latitude) > MAX_LATITUDE || Math.abs(longitude) > MAX_LONGITUDE) return null;
  const coordinates = `${latitude.toFixed(COORDINATE_DIGITS)}, ${longitude.toFixed(COORDINATE_DIGITS)}`;
  return {
    url: openStreetMapUrl(latitude, longitude, zoom),
    label: label === '' ? coordinates : label,
  };
}

function mapHelper(address: unknown, options: HelperOptions): Handlebars.SafeString | string {
  const escape = Handlebars.escapeExpression;
  const place = mapPlace(address, options);
  const className: unknown = options.hash.class;
  const classAttribute =
    typeof className === 'string' && className !== '' ? ` class="${escape(className)}"` : '';
  if (renderDataOf(options).liveMaps !== true) {
    const label = place === null ? 'Add an address to show the map here.' : place.label;
    return new Handlebars.SafeString(
      `<div${classAttribute} data-map="placeholder"><strong>${escape(label)}</strong><small>${MAP_NOTE}</small></div>`,
    );
  }
  if (place === null) return '';
  const attributes = [
    `src="${escape(place.url)}"`,
    `title="${escape(`Map of ${place.label}`)}"`,
    'loading="lazy"',
    'referrerpolicy="no-referrer-when-downgrade"',
    'allowfullscreen',
  ];
  return new Handlebars.SafeString(
    `<iframe${classAttribute} data-map="live" ${attributes.join(' ')}></iframe>`,
  );
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
  formAttrs: formAttrsHelper,
  embedUrl: embedUrlHelper,
  formatDate: formatDateHelper,
  map: mapHelper,
});
