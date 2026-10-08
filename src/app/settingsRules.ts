import {
  IMAGE_PREVIEW_SIZES,
  OPEN_GRAPH_TYPES,
  PAGE_SCHEMA_TYPES,
  SITE_ENTITY_TYPES,
  SITEMAP_FREQUENCIES,
  VERIFICATION_SERVICES,
  type MetaTag,
  type PageMeta,
  type SharedMeta,
  type SiteMeta,
  type VerificationService,
} from './types';

export const SOCIAL_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];

export const FAVICON_TYPES = ['image/png', 'image/svg+xml', 'image/x-icon'];

export type SettingKey = 'title' | 'description' | 'language' | 'baseUrl' | 'titleTemplate';

const LANGUAGE_CODE = /^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$/;
const WEB_URL = /^https?:\/\/[^\s/$.?#][^\s]*$/i;

export function settingError(key: SettingKey, value: string): string | null {
  const trimmed = value.trim();
  if (key === 'title' && trimmed === '') {
    return 'Enter a site title';
  } else if (key === 'language' && !LANGUAGE_CODE.test(trimmed)) {
    return 'Pick a language';
  } else if (key === 'baseUrl' && trimmed !== '' && !WEB_URL.test(trimmed)) {
    return 'Enter a full address that starts with https://';
  } else {
    return null;
  }
}

export type Parsed<T> = { value: T } | { error: string };

type Rule<T> = (value: unknown) => Parsed<T>;

type Rules<Meta> = { [Key in keyof Meta]-?: Rule<NonNullable<Meta[Key]>> };

export const APP_ICON_TYPES = ['image/png'];

export const AI_CRAWLERS = [
  'GPTBot',
  'ClaudeBot',
  'anthropic-ai',
  'Google-Extended',
  'Applebot-Extended',
  'CCBot',
  'Bytespider',
  'meta-externalagent',
  'cohere-ai',
];

const MAX_SHORT_TEXT = 200;
const MAX_LONG_TEXT = 1000;
const MAX_IMAGE_ALT = 420;
const MAX_APP_NAME = 45;
const MAX_ROBOTS_RULES = 5000;
const MAX_JSON_LD = 20000;
const MAX_META_TAGS = 30;
const MAX_PROFILES = 20;
const PRIORITY_STEPS = 10;

const HANDLE = /^@?(?<name>[A-Za-z0-9_]{1,15})$/;
const COLOR = /^(?:#[0-9a-f]{3}|#[0-9a-f]{6}|var\(--[a-z0-9-]+\))$/i;
const EMAIL = /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/;
const PHONE = /^\+?[\d\s().-]{3,30}$/;
const META_KEY = /^[A-Za-z][\w.:-]*$/;
const VERIFICATION_TOKEN = /^[\w\-=:.+/]{1,200}$/;
const ROBOTS_LINE = /^\s*(?:#.*|[A-Za-z-]+\s*:\s*\S.*)?$/;
const CONTENT_ATTRIBUTE = /content\s*=\s*["'](?<content>[^"']*)["']/i;
const LINE_BREAK = /\r?\n/;

function text(maxLength: number): Rule<string> {
  return (value) => {
    if (typeof value !== 'string') return { error: 'Enter text' };
    if (value.length > maxLength) return { error: `Use at most ${maxLength} characters` };
    return { value };
  };
}

function flag(value: unknown): Parsed<boolean> {
  if (typeof value !== 'boolean') return { error: 'Choose yes or no' };
  return { value };
}

function choice<T extends string>(options: readonly T[]): Rule<T> {
  return (value) => {
    for (const option of options) {
      if (option === value) return { value: option };
    }
    return { error: 'Pick one of the options' };
  };
}

function handle(value: unknown): Parsed<string> {
  const name = typeof value === 'string' ? HANDLE.exec(value.trim())?.groups?.name : undefined;
  if (name === undefined) return { error: 'Enter a username like @acme' };
  return { value: `@${name}` };
}

function color(value: unknown): Parsed<string> {
  if (typeof value !== 'string' || !COLOR.test(value.trim())) return { error: 'Pick a color' };
  return { value: value.trim() };
}

function webUrl(value: unknown): Parsed<string> {
  if (typeof value !== 'string' || !WEB_URL.test(value.trim())) {
    return { error: 'Enter a full address that starts with https://' };
  }
  return { value: value.trim() };
}

function email(value: unknown): Parsed<string> {
  if (typeof value !== 'string' || !EMAIL.test(value.trim())) {
    return { error: 'Enter an email address' };
  }
  return { value: value.trim() };
}

function phone(value: unknown): Parsed<string> {
  if (typeof value !== 'string' || !PHONE.test(value.trim())) {
    return { error: 'Enter a phone number' };
  }
  return { value: value.trim() };
}

function priority(value: unknown): Parsed<number> {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 1) {
    return { error: 'Use a number from 0 to 1' };
  }
  return { value: Math.round(value * PRIORITY_STEPS) / PRIORITY_STEPS };
}

function isMetaAttribute(value: unknown): value is MetaTag['attribute'] {
  return value === 'name' || value === 'property';
}

function metaTags(value: unknown): Parsed<MetaTag[]> {
  if (!Array.isArray(value)) return { error: 'Add meta tags as a list' };
  if (value.length > MAX_META_TAGS) return { error: `Use at most ${MAX_META_TAGS} meta tags` };
  const tags: MetaTag[] = [];
  for (const item of value) {
    if (typeof item !== 'object' || item === null) return { error: 'Fill in every meta tag' };
    const { attribute, key, content } = { attribute: null, key: null, content: null, ...item };
    if (!isMetaAttribute(attribute) || typeof key !== 'string' || typeof content !== 'string') {
      return { error: 'Fill in every meta tag' };
    }
    const trimmedKey = key.trim();
    if (trimmedKey !== '' && !META_KEY.test(trimmedKey)) {
      return { error: 'Start meta names with a letter and use letters, digits, : . - or _' };
    }
    if (content.length > MAX_LONG_TEXT) {
      return { error: `Use at most ${MAX_LONG_TEXT} characters in a meta tag` };
    }
    tags.push({ attribute, key: trimmedKey, content });
  }
  return { value: tags };
}

export function parseJsonLd(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch (error) {
    console.warn('Skipped structured data that is not valid JSON', error);
    return null;
  }
}

function jsonLd(value: unknown): Parsed<string> {
  if (typeof value !== 'string') return { error: 'Enter JSON-LD' };
  if (value.length > MAX_JSON_LD) return { error: `Use at most ${MAX_JSON_LD} characters` };
  try {
    const parsed: unknown = JSON.parse(value);
    if (typeof parsed !== 'object' || parsed === null) {
      return { error: 'Enter a JSON object or list' };
    }
  } catch {
    return { error: 'Enter valid JSON, for example { "@type": "Event" }' };
  }
  return { value };
}

function robotsRules(value: unknown): Parsed<string> {
  if (typeof value !== 'string') return { error: 'Enter robots.txt rules' };
  if (value.length > MAX_ROBOTS_RULES)
    return { error: `Use at most ${MAX_ROBOTS_RULES} characters` };
  const lines = value.split(LINE_BREAK);
  for (const [index, line] of lines.entries()) {
    if (!ROBOTS_LINE.test(line)) {
      return { error: `Line ${index + 1} needs a rule like Disallow: /private/` };
    }
  }
  return { value };
}

export function verificationToken(input: string): string {
  const pasted = CONTENT_ATTRIBUTE.exec(input)?.groups?.content;
  return (pasted ?? input).trim();
}

function verification(value: unknown): Parsed<Partial<Record<VerificationService, string>>> {
  if (typeof value !== 'object' || value === null) return { error: 'Enter verification codes' };
  const codes: Partial<Record<VerificationService, string>> = {};
  for (const service of VERIFICATION_SERVICES) {
    const code: unknown = Reflect.get(value, service);
    if (code === undefined || code === '') continue;
    if (typeof code !== 'string' || !VERIFICATION_TOKEN.test(code)) {
      return { error: 'Paste the code or the whole meta tag you were given' };
    }
    codes[service] = code;
  }
  return { value: codes };
}

export function profileLines(text: string | undefined): string[] {
  const profiles: string[] = [];
  for (const line of text?.split(LINE_BREAK) ?? []) {
    if (line.trim() !== '') profiles.push(line.trim());
  }
  return profiles;
}

function socialProfiles(value: unknown): Parsed<string> {
  if (typeof value !== 'string') return { error: 'Add one profile address per line' };
  const profiles = profileLines(value);
  if (profiles.length > MAX_PROFILES) return { error: `Use at most ${MAX_PROFILES} profiles` };
  for (const [index, profile] of profiles.entries()) {
    if (!WEB_URL.test(profile)) {
      return { error: `Profile ${index + 1} needs a full address that starts with https://` };
    }
  }
  return { value };
}

const SHARED_META_RULES: Rules<SharedMeta> = {
  author: text(MAX_SHORT_TEXT),
  keywords: text(MAX_LONG_TEXT),
  follow: flag,
  snippets: flag,
  imagePreview: choice(IMAGE_PREVIEW_SIZES),
  translate: flag,
  openGraphType: choice(OPEN_GRAPH_TYPES),
  socialImageAlt: text(MAX_IMAGE_ALT),
  twitterCreator: handle,
  themeColor: color,
  sitemapFrequency: choice(SITEMAP_FREQUENCIES),
  sitemapPriority: priority,
  metaTags,
  jsonLd,
};

export const SITE_META_RULES: Rules<SiteMeta> = {
  ...SHARED_META_RULES,
  appName: text(MAX_APP_NAME),
  backgroundColor: color,
  twitterSite: handle,
  verification,
  blockAiCrawlers: flag,
  robotsRules,
  schemaMarkup: flag,
  schemaEntity: choice(SITE_ENTITY_TYPES),
  entityName: text(MAX_SHORT_TEXT),
  socialProfiles,
  contactEmail: email,
  contactPhone: phone,
};

export const PAGE_META_RULES: Rules<PageMeta> = {
  ...SHARED_META_RULES,
  canonicalUrl: webUrl,
  sitemapExcluded: flag,
  schemaType: choice(PAGE_SCHEMA_TYPES),
};

export type SiteMetaKey = keyof SiteMeta;

export type PageMetaKey = keyof PageMeta;

export function isSiteMetaKey(key: string): key is SiteMetaKey {
  return Object.hasOwn(SITE_META_RULES, key);
}

export function isPageMetaKey(key: string): key is PageMetaKey {
  return Object.hasOwn(PAGE_META_RULES, key);
}

export function isUnsetMeta(value: unknown): boolean {
  if (value === undefined || value === null) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
}

export function siteMetaError(key: SiteMetaKey, value: unknown): string | null {
  if (isUnsetMeta(value)) return null;
  const parsed = SITE_META_RULES[key](value);
  return 'error' in parsed ? parsed.error : null;
}

export function pageMetaError(key: PageMetaKey, value: unknown): string | null {
  if (isUnsetMeta(value)) return null;
  const parsed = PAGE_META_RULES[key](value);
  return 'error' in parsed ? parsed.error : null;
}
