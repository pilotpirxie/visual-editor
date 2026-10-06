import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';

export type Rendered = {
  container: HTMLDivElement;
  rerender(ui: ReactNode): void;
  unmount(): void;
};

export type KeyModifiers = {
  altKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
};

type MountedRoot = { root: Root; container: HTMLDivElement };

const mountedRoots = new Set<MountedRoot>();

export function render(ui: ReactNode): Rendered {
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  const mounted: MountedRoot = { root, container };
  mountedRoots.add(mounted);
  act(() => root.render(ui));

  function rerender(next: ReactNode): void {
    act(() => root.render(next));
  }

  function unmount(): void {
    if (!mountedRoots.has(mounted)) return;
    mountedRoots.delete(mounted);
    act(() => root.unmount());
    container.remove();
  }

  return { container, rerender, unmount };
}

export function unmountAll(): void {
  for (const { root, container } of mountedRoots) {
    act(() => root.unmount());
    container.remove();
  }
  mountedRoots.clear();
}

export function runInAct(callback: () => void): void {
  act(callback);
}

function asHtmlElement(element: Element | null, purpose: string): HTMLElement {
  if (!(element instanceof HTMLElement)) throw new Error(`Expected an element to ${purpose}`);
  return element;
}

export function click(element: Element | null): void {
  const target = asHtmlElement(element, 'click');
  act(() => target.click());
}

export function changeValue(element: Element | null, value: string): void {
  const isEditable =
    element instanceof HTMLInputElement ||
    element instanceof HTMLTextAreaElement ||
    element instanceof HTMLSelectElement;
  if (!isEditable) throw new Error('Expected an input, textarea or select');
  const prototype = Object.getPrototypeOf(element);
  Object.getOwnPropertyDescriptor(prototype, 'value')?.set?.call(element, value);
  const eventType = element instanceof HTMLSelectElement ? 'change' : 'input';
  act(() => element.dispatchEvent(new Event(eventType, { bubbles: true })));
}

export function pressKey(
  target: EventTarget,
  key: string,
  modifiers: Partial<KeyModifiers> = {},
): KeyboardEvent {
  const event = new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    cancelable: true,
    ...modifiers,
  });
  act(() => {
    target.dispatchEvent(event);
  });
  return event;
}

export function firePointer(target: EventTarget, type: string, init: PointerEventInit): void {
  const event = new PointerEvent(type, {
    bubbles: true,
    cancelable: true,
    pointerId: 1,
    pointerType: 'mouse',
    ...init,
  });
  act(() => {
    target.dispatchEvent(event);
  });
}

export function blur(element: Element | null): void {
  const target = asHtmlElement(element, 'blur');
  act(() => target.dispatchEvent(new FocusEvent('focusout', { bubbles: true })));
}

export function queryButton(scope: ParentNode, name: string): HTMLButtonElement | null {
  for (const button of scope.querySelectorAll('button')) {
    const label = button.getAttribute('aria-label') ?? button.textContent?.trim();
    if (label === name) return button;
  }
  return null;
}

export function getButton(scope: ParentNode, name: string): HTMLButtonElement {
  const button = queryButton(scope, name);
  if (button === null) throw new Error(`No button named "${name}"`);
  return button;
}
