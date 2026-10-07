import { beforeEach, describe, expect, it } from 'vitest';
import {
  blockIdFromEvent,
  blockRoot,
  blockSpans,
  fieldPathFromEvent,
  isElementTarget,
} from './frameDom';

const PAGE = `
  <div id="ve-header"><nav data-block-id="shared-nav">Navigation</nav></div>
  <div id="ve-page">
  <section data-block-id="block-1">
    <h2 data-field="title"><em class="inner">Title</em></h2>
    <article data-field="items.2"><h3 class="item-title">Item</h3></article>
    <p class="plain">No field</p>
  </section>
  <footer data-block-id="block-&quot;2&quot;"><p class="footer-text">Footer</p></footer>
  </div>
  <p data-field="orphan" class="orphan">Outside</p>
`;

function clickOn(selector: string): Event {
  const target = document.querySelector(selector);
  if (target === null) throw new Error(`No element matches ${selector}`);
  const event = new MouseEvent('click', { bubbles: true });
  target.dispatchEvent(event);
  return event;
}

beforeEach(() => {
  document.body.innerHTML = PAGE;
});

describe('isElementTarget', () => {
  it('accepts elements and rejects other event targets', () => {
    expect(isElementTarget(document.body)).toBe(true);
    expect(isElementTarget(window)).toBe(false);
    expect(isElementTarget(null)).toBe(false);
  });
});

describe('blockRoot', () => {
  it('finds a block root by id, even when the id needs escaping', () => {
    expect(blockRoot(document, 'block-1')?.tagName).toBe('SECTION');
    expect(blockRoot(document, 'block-"2"')?.tagName).toBe('FOOTER');
  });

  it('returns null for an unknown block', () => {
    expect(blockRoot(document, 'missing')).toBeNull();
  });
});

describe('blockSpans', () => {
  it('measures the blocks of the page itself, in order, leaving out shared ones', () => {
    expect(blockSpans(document)).toHaveLength(2);
  });
});

describe('blockIdFromEvent', () => {
  it('finds the block that contains the event target', () => {
    expect(blockIdFromEvent(clickOn('.inner'))).toBe('block-1');
    expect(blockIdFromEvent(clickOn('.footer-text'))).toBe('block-"2"');
  });

  it('returns null outside every block', () => {
    expect(blockIdFromEvent(clickOn('.orphan'))).toBeNull();
  });
});

describe('fieldPathFromEvent', () => {
  it('finds the closest bound element inside a block', () => {
    expect(fieldPathFromEvent(clickOn('.inner'))).toBe('title');
    expect(fieldPathFromEvent(clickOn('.item-title'))).toBe('items.2');
  });

  it('returns null for unbound elements and for bound elements outside blocks', () => {
    expect(fieldPathFromEvent(clickOn('.plain'))).toBeNull();
    expect(fieldPathFromEvent(clickOn('.orphan'))).toBeNull();
  });
});
