import { describe, expect, it } from 'vitest';
import { createScrollAnchor } from './scrollAnchor';

type FakeWindow = { scrollY: number; scrollBy(x: number, y: number): void };
type FakeView = { window: FakeWindow; scrolls: number[] };

function createFakeView(): FakeView {
  const scrolls: number[] = [];
  const fakeWindow: FakeWindow = {
    scrollY: 0,
    scrollBy(_x: number, y: number) {
      scrolls.push(y);
    },
  };
  return { window: fakeWindow, scrolls };
}

function elementAt(top: number): { element: HTMLElement; moveTo(nextTop: number): void } {
  const element = document.createElement('div');
  document.body.append(element);
  let currentTop = top;
  element.getBoundingClientRect = () => new DOMRect(0, currentTop, 100, 50);
  return {
    element,
    moveTo(nextTop: number) {
      currentTop = nextTop;
    },
  };
}

async function afterMicrotasks(): Promise<void> {
  await Promise.resolve();
}

describe('createScrollAnchor', () => {
  it('scrolls by however far the anchored element moved after a change', async () => {
    const view = createFakeView();
    const anchored = elementAt(200);
    const anchor = createScrollAnchor(
      () => view.window,
      () => anchored.element,
    );
    anchor.capture();
    anchored.moveTo(260);
    await afterMicrotasks();
    expect(view.scrolls).toEqual([60]);
  });

  it('does not scroll when the element stayed in place', async () => {
    const view = createFakeView();
    const anchored = elementAt(200);
    const anchor = createScrollAnchor(
      () => view.window,
      () => anchored.element,
    );
    anchor.capture();
    await afterMicrotasks();
    expect(view.scrolls).toEqual([]);
  });

  it('measures once per batch of changes, from the first capture', async () => {
    const view = createFakeView();
    const anchored = elementAt(200);
    const anchor = createScrollAnchor(
      () => view.window,
      () => anchored.element,
    );
    anchor.capture();
    anchored.moveTo(230);
    anchor.capture();
    anchored.moveTo(250);
    await afterMicrotasks();
    expect(view.scrolls).toEqual([50]);
  });

  it('does nothing when there is no element to anchor to', async () => {
    const view = createFakeView();
    const anchor = createScrollAnchor(
      () => view.window,
      () => null,
    );
    anchor.capture();
    await afterMicrotasks();
    expect(view.scrolls).toEqual([]);
  });

  it('skips the correction when the anchored element was removed by the change', async () => {
    const view = createFakeView();
    const anchored = elementAt(200);
    const anchor = createScrollAnchor(
      () => view.window,
      () => anchored.element,
    );
    anchor.capture();
    anchored.element.remove();
    await afterMicrotasks();
    expect(view.scrolls).toEqual([]);
  });

  it('does not undo a deliberate scroll made while the change was applied', async () => {
    const view = createFakeView();
    const anchored = elementAt(200);
    const anchor = createScrollAnchor(
      () => view.window,
      () => anchored.element,
    );
    anchor.capture();
    view.window.scrollY = 500;
    anchored.moveTo(-300);
    await afterMicrotasks();
    expect(view.scrolls).toEqual([]);
  });

  it('corrects only the layout shift when content grows and the view also scrolls', async () => {
    const view = createFakeView();
    const anchored = elementAt(200);
    const anchor = createScrollAnchor(
      () => view.window,
      () => anchored.element,
    );
    anchor.capture();
    view.window.scrollY = 100;
    anchored.moveTo(140);
    await afterMicrotasks();
    expect(view.scrolls).toEqual([40]);
  });

  it('drops a captured position when the change is cancelled, such as a page switch', async () => {
    const view = createFakeView();
    const anchored = elementAt(200);
    const anchor = createScrollAnchor(
      () => view.window,
      () => anchored.element,
    );
    anchor.capture();
    anchored.moveTo(900);
    anchor.cancel();
    await afterMicrotasks();
    expect(view.scrolls).toEqual([]);
  });
});
