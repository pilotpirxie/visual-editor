import type { VerticalSpan } from './geometry';

export function isElementTarget(target: EventTarget | null): target is Element {
  return target !== null && 'closest' in target;
}

export function blockRoot(doc: Document, blockId: string): Element | null {
  return doc.querySelector(`[data-block-id="${CSS.escape(blockId)}"]`);
}

export function blockSpans(doc: Document): VerticalSpan[] {
  return [...doc.querySelectorAll('[data-block-id]')].map((element) => {
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
