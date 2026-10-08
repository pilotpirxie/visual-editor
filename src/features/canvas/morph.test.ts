import { describe, expect, it } from 'vitest';
import { morphChildren } from './morph';

function host(html: string): HTMLElement {
  const element = document.createElement('div');
  element.innerHTML = html;
  return element;
}

describe('morphChildren', () => {
  it('updates changed text in place, keeping element identity', () => {
    const target = host('<section><h2>Old</h2><p>Same</p></section>');
    const heading = target.querySelector('h2');
    const paragraph = target.querySelector('p');
    morphChildren(target, '<section><h2>New</h2><p>Same</p></section>');
    expect(target.querySelector('h2')).toBe(heading);
    expect(target.querySelector('p')).toBe(paragraph);
    expect(heading?.textContent).toBe('New');
  });

  it('adds, changes and removes attributes', () => {
    const target = host('<a href="/a" class="x" title="t">Link</a>');
    const link = target.firstElementChild;
    morphChildren(target, '<a href="/b" class="x" rel="noopener">Link</a>');
    expect(target.firstElementChild).toBe(link);
    expect(link?.getAttribute('href')).toBe('/b');
    expect(link?.getAttribute('rel')).toBe('noopener');
    expect(link?.hasAttribute('title')).toBe(false);
  });

  it('leaves an element that is being edited on the page untouched', () => {
    const target = host('<section><h2 data-ve-inline-edit="">Typing</h2><p>Old</p></section>');
    const heading = target.querySelector('h2');
    morphChildren(target, '<section><h2>Saved</h2><p>New</p></section>');
    expect(target.querySelector('h2')).toBe(heading);
    expect(heading?.textContent).toBe('Typing');
    expect(heading?.hasAttribute('data-ve-inline-edit')).toBe(true);
    expect(target.querySelector('p')?.textContent).toBe('New');
  });

  it('appends and removes children', () => {
    const target = host('<ul><li>1</li><li>2</li></ul>');
    morphChildren(target, '<ul><li>1</li><li>2</li><li>3</li></ul>');
    expect(target.innerHTML).toBe('<ul><li>1</li><li>2</li><li>3</li></ul>');
    morphChildren(target, '<ul><li>1</li></ul>');
    expect(target.innerHTML).toBe('<ul><li>1</li></ul>');
  });

  it('replaces a node whose tag changes', () => {
    const target = host('<section><h2>Title</h2></section>');
    const heading = target.querySelector('h2');
    morphChildren(target, '<section><h3>Title</h3></section>');
    expect(target.querySelector('h3')).not.toBeNull();
    expect(heading?.isConnected).toBe(false);
  });

  it('replaces elements whose id changes', () => {
    const target = host('<div id="a">One</div>');
    const first = target.firstElementChild;
    morphChildren(target, '<div id="b">One</div>');
    expect(target.firstElementChild).not.toBe(first);
    expect(target.firstElementChild?.id).toBe('b');
  });

  it('keeps an accordion the visitor opened', () => {
    const target = host('<details><summary>Q</summary>A</details>');
    target.querySelector('details')?.setAttribute('open', '');
    morphChildren(target, '<details><summary>Q, edited</summary>A</details>');
    expect(target.querySelector('details')?.hasAttribute('open')).toBe(true);
    expect(target.querySelector('summary')?.textContent).toBe('Q, edited');
  });
});
