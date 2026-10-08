import { cachedByText } from './textCache';
import { isSafeImageSrc, isSafeUrl } from './sanitize';

export type StrippedHtml = { html: string; removed: string[] };

const REMOVED_ELEMENTS = new Set([
  'script',
  'style',
  'iframe',
  'frame',
  'frameset',
  'object',
  'embed',
  'applet',
  'base',
  'meta',
  'link',
  'noscript',
  'template',
  'math',
  'animate',
  'animatemotion',
  'animatetransform',
  'set',
]);

const REMOVED_ATTRIBUTES = new Set(['srcdoc', 'formaction']);
const LINK_ATTRIBUTES = new Set(['href', 'xlink:href', 'action', 'cite', 'background', 'data']);
const IMAGE_ATTRIBUTES = new Set(['src', 'poster']);
const UNSAFE_STYLE = /javascript:|expression\s*\(|@import|behavior\s*:|-moz-binding/i;
const MAX_PASSES = 3;

function countLabel(count: number, label: string): string {
  return count === 1 ? label : `${count} × ${label}`;
}

function isSafeSrcset(value: string): boolean {
  for (const candidate of value.split(',')) {
    const url = candidate.trim().split(/\s+/)[0] ?? '';
    if (url !== '' && !isSafeImageSrc(url)) return false;
  }
  return true;
}

function attributeProblem(name: string, value: string): string | null {
  if (name.startsWith('on')) {
    return `${name} attribute`;
  } else if (REMOVED_ATTRIBUTES.has(name)) {
    return `${name} attribute`;
  } else if (LINK_ATTRIBUTES.has(name) && !isSafeUrl(value)) {
    return `unsafe address in ${name}`;
  } else if (IMAGE_ATTRIBUTES.has(name) && !isSafeImageSrc(value)) {
    return `unsafe address in ${name}`;
  } else if (name === 'srcset' && !isSafeSrcset(value)) {
    return 'unsafe address in srcset';
  } else if (name === 'style' && UNSAFE_STYLE.test(value)) {
    return 'unsafe style attribute';
  } else {
    return null;
  }
}

function stripOnce(html: string, counts: Map<string, number>): string {
  const doc = new DOMParser().parseFromString(`<!doctype html><body>${html}`, 'text/html');
  function count(label: string): void {
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  for (const element of [...doc.body.querySelectorAll('*')]) {
    const name = element.localName.toLowerCase();
    if (REMOVED_ELEMENTS.has(name)) {
      count(`<${name}>`);
      element.remove();
      continue;
    }
    for (const attribute of [...element.attributes]) {
      const problem = attributeProblem(attribute.name.toLowerCase(), attribute.value);
      if (problem === null) continue;
      count(problem);
      element.removeAttribute(attribute.name);
    }
  }
  return doc.body.innerHTML;
}

function stripUntilStable(html: string): StrippedHtml {
  const counts = new Map<string, number>();
  let current = html;
  for (let pass = 0; pass < MAX_PASSES; pass += 1) {
    const next = stripOnce(current, counts);
    if (next === current) break;
    current = next;
  }
  const removed: string[] = [];
  for (const [label, total] of counts) removed.push(countLabel(total, label));
  return { html: current, removed };
}

const STRIPPED_CACHE_SIZE = 100;

const strippedHtml = cachedByText(STRIPPED_CACHE_SIZE, stripUntilStable);

export function stripUnsafeHtml(html: string): StrippedHtml {
  const stripped = strippedHtml(html);
  return { html: stripped.html, removed: [...stripped.removed] };
}

export type RootDecoration = { anchor?: string; classes: string[] };

export function decorateHtmlRoots(html: string, { anchor, classes }: RootDecoration): string {
  if (anchor === undefined && classes.length === 0) return html;
  const template = document.createElement('template');
  template.innerHTML = html;
  const roots = [...template.content.children];
  if (anchor !== undefined) roots[0]?.setAttribute('id', anchor);
  for (const root of roots) root.classList.add(...classes);
  return template.innerHTML;
}
