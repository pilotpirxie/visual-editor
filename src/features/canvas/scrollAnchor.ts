export type ScrollAnchor = { capture(): void };

type ScrollableView = { scrollY: number; scrollBy(x: number, y: number): void };

type CapturedAnchor = { element: Element; top: number; scrollY: number };

export function createScrollAnchor(
  getWindow: () => ScrollableView | null,
  findAnchor: () => Element | null,
): ScrollAnchor {
  let pending: CapturedAnchor | null = null;

  function restore(): void {
    const anchor = pending;
    pending = null;
    const view = getWindow();
    if (anchor === null || view === null || !anchor.element.isConnected) return;
    const scrolledBy = view.scrollY - anchor.scrollY;
    const layoutShift = anchor.element.getBoundingClientRect().top - anchor.top + scrolledBy;
    if (layoutShift !== 0) view.scrollBy(0, layoutShift);
  }

  function capture(): void {
    if (pending !== null) return;
    const view = getWindow();
    const element = findAnchor();
    if (view === null || element === null) return;
    pending = { element, top: element.getBoundingClientRect().top, scrollY: view.scrollY };
    queueMicrotask(restore);
  }

  return { capture };
}
