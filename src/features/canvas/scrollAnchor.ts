export type ScrollAnchor = { capture(): void };

export function createScrollAnchor(
  getWindow: () => Window | null,
  findAnchor: () => Element | null,
): ScrollAnchor {
  let pending: { element: Element; top: number } | null = null;

  return {
    capture(): void {
      if (pending) return;
      const element = findAnchor();
      if (!element) return;
      pending = { element, top: element.getBoundingClientRect().top };
      queueMicrotask(() => {
        const anchor = pending;
        pending = null;
        if (!anchor?.element.isConnected) return;
        const shift = anchor.element.getBoundingClientRect().top - anchor.top;
        if (shift !== 0) getWindow()?.scrollBy(0, shift);
      });
    },
  };
}
