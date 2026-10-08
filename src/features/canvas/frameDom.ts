import type { VerticalSpan } from './geometry';

export function isElementTarget(target: EventTarget | null): target is Element {
  return target !== null && 'closest' in target;
}

export function blockRoot(doc: Document, blockId: string): Element | null {
  return doc.querySelector(`[data-block-id="${CSS.escape(blockId)}"]`);
}

export const PAGE_ROOT_ID = 've-page';

export const CANVAS_ID = 've-canvas';

export function focusCanvas(): void {
  document.getElementById(CANVAS_ID)?.focus();
}

export function blockSpans(doc: Document): VerticalSpan[] {
  return [...doc.querySelectorAll(`#${PAGE_ROOT_ID} [data-block-id]`)].map((element) => {
    const { top, bottom } = element.getBoundingClientRect();
    return { top, bottom };
  });
}

export function blockIdFromEvent(event: Event): string | null {
  if (!isElementTarget(event.target)) return null;
  const blockElement = event.target.closest('[data-block-id]');
  if (blockElement === null) return null;
  return blockElement.getAttribute('data-block-id');
}

export function fieldPathFromEvent(event: Event): string | null {
  if (!isElementTarget(event.target)) return null;
  const field = event.target.closest('[data-field]');
  if (field === null || field.closest('[data-block-id]') === null) return null;
  return field.getAttribute('data-field');
}

export function pageRootTop(doc: Document): number {
  return doc.getElementById(PAGE_ROOT_ID)?.getBoundingClientRect().top ?? 0;
}
