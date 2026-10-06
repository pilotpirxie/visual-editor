import { describe, expect, it } from 'vitest';
import { fieldPathFromEvent } from './frameDom';

function clickOn(selector: string): Event {
  const target = document.querySelector(selector);
  if (target === null) throw new Error(`No element matches ${selector}`);
  const event = new MouseEvent('click', { bubbles: true });
  target.dispatchEvent(event);
  return event;
}

describe('fieldPathFromEvent', () => {
  document.body.innerHTML = `
    <section data-block-id="block-1">
      <h2 data-field="title"><em class="inner">Title</em></h2>
      <article data-field="items.2"><h3 class="item-title">Item</h3></article>
      <p class="plain">No field</p>
    </section>
    <p data-field="orphan" class="orphan">Outside</p>
  `;

  it('finds the closest bound element inside a block', () => {
    expect(fieldPathFromEvent(clickOn('.inner'))).toBe('title');
    expect(fieldPathFromEvent(clickOn('.item-title'))).toBe('items.2');
  });

  it('returns null for unbound elements and elements outside blocks', () => {
    expect(fieldPathFromEvent(clickOn('.plain'))).toBeNull();
    expect(fieldPathFromEvent(clickOn('.orphan'))).toBeNull();
  });
});
