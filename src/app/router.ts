import { useMemo, useSyncExternalStore, type MouseEvent } from 'react';

export type Route =
  | { name: 'home' }
  | { name: 'editor'; projectId: string; pageId: string | null }
  | { name: 'not-found' };

export const HOME_PATH = '/';

const EDITOR_PATH = /^\/p\/(?<projectId>[\w-]+)(?:\/(?<pageId>[\w-]+))?\/?$/;

const listeners = new Set<() => void>();

export function parseRoute(pathname: string): Route {
  if (pathname === HOME_PATH) return { name: 'home' };
  const groups = EDITOR_PATH.exec(pathname)?.groups;
  if (groups?.projectId === undefined) return { name: 'not-found' };
  return { name: 'editor', projectId: groups.projectId, pageId: groups.pageId ?? null };
}

export function projectPath(projectId: string): string {
  return `/p/${projectId}`;
}

export function editorPath(projectId: string, pageId: string): string {
  return `${projectPath(projectId)}/${pageId}`;
}

export function navigate(path: string, { replace = false } = {}): void {
  if (replace) window.history.replaceState(null, '', path);
  else window.history.pushState(null, '', path);
  for (const listener of listeners) listener();
}

export function followLink(event: MouseEvent<HTMLAnchorElement>): void {
  const isPlainClick =
    event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
  if (!isPlainClick) return;
  event.preventDefault();
  navigate(event.currentTarget.pathname);
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  window.addEventListener('popstate', listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('popstate', listener);
  };
}

function currentPathname(): string {
  return window.location.pathname;
}

export function useRoute(): Route {
  const pathname = useSyncExternalStore(subscribe, currentPathname);
  return useMemo(() => parseRoute(pathname), [pathname]);
}
