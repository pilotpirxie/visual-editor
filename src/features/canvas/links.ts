import { isSafeUrl } from '../../render/sanitize';

export type CanvasLinkTarget =
  | { kind: 'none' }
  | { kind: 'section'; anchor: string }
  | { kind: 'page'; pageId: string; anchor: string | null }
  | { kind: 'external'; href: string };

const PAGE_FILE = /^(?<slug>[a-z0-9-]+)\.html(?:#(?<anchor>.*))?$/;
const URL_SCHEME = /^[a-z][a-z0-9+.-]*:/i;
const NO_TARGET: CanvasLinkTarget = { kind: 'none' };

function decodedAnchor(anchor: string): string {
  try {
    return decodeURIComponent(anchor);
  } catch {
    return anchor;
  }
}

function pageIdForSlug(slug: string, pageSlugs: Record<string, string>): string | null {
  for (const [pageId, pageSlug] of Object.entries(pageSlugs)) {
    if (pageSlug === slug) return pageId;
  }
  return null;
}

export function canvasLinkTarget(
  href: string | null,
  pageSlugs: Record<string, string>,
): CanvasLinkTarget {
  const trimmed = href?.trim() ?? '';
  if (trimmed === '' || trimmed === '#') return NO_TARGET;
  if (trimmed.startsWith('#')) return { kind: 'section', anchor: decodedAnchor(trimmed.slice(1)) };

  const pageFile = PAGE_FILE.exec(trimmed)?.groups;
  if (pageFile?.slug !== undefined) {
    const pageId = pageIdForSlug(pageFile.slug, pageSlugs);
    if (pageId === null) return NO_TARGET;
    const anchor = pageFile.anchor === undefined || pageFile.anchor === '' ? null : pageFile.anchor;
    return { kind: 'page', pageId, anchor: anchor === null ? null : decodedAnchor(anchor) };
  }

  if (URL_SCHEME.test(trimmed) && isSafeUrl(trimmed)) return { kind: 'external', href: trimmed };
  return NO_TARGET;
}
