import type { KeyboardEvent } from 'react';

export type RovingOrientation = 'horizontal' | 'vertical';

const NEXT_KEYS: Record<RovingOrientation, string> = {
  horizontal: 'ArrowRight',
  vertical: 'ArrowDown',
};

const PREVIOUS_KEYS: Record<RovingOrientation, string> = {
  horizontal: 'ArrowLeft',
  vertical: 'ArrowUp',
};

export function rovingIndex(
  key: string,
  current: number,
  count: number,
  orientation: RovingOrientation,
): number | null {
  if (count === 0) return null;
  if (key === NEXT_KEYS[orientation]) {
    return current < 0 ? 0 : (current + 1) % count;
  } else if (key === PREVIOUS_KEYS[orientation]) {
    return current <= 0 ? count - 1 : current - 1;
  } else if (key === 'Home') {
    return 0;
  } else if (key === 'End') {
    return count - 1;
  } else {
    return null;
  }
}

export function focusNeighbour(
  event: KeyboardEvent<HTMLElement>,
  itemSelector: string,
  orientation: RovingOrientation,
): boolean {
  const items = [...event.currentTarget.querySelectorAll<HTMLElement>(itemSelector)];
  const focused = event.currentTarget.ownerDocument.activeElement;
  const current = items.findIndex((item) => item === focused);
  const next = rovingIndex(event.key, current, items.length, orientation);
  const target = next === null ? undefined : items[next];
  if (target === undefined) return false;
  event.preventDefault();
  target.focus();
  return true;
}
