import type { VerticalSpan } from './dropIndex';

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
  return event.target.closest('[data-block-id]')?.getAttribute('data-block-id') ?? null;
}
