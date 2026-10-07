import { afterEach, describe, expect, it } from 'vitest';
import '../core';
import './dropdown';

function fakePopover(menu: HTMLElement): void {
  let isMenuOpen = false;
  const matches = menu.matches.bind(menu);
  function setOpen(next: boolean): void {
    if (isMenuOpen === next) return;
    isMenuOpen = next;
    menu.dispatchEvent(new Event('toggle'));
  }
  function matchesWithPopover(selector: string): boolean {
    if (selector === ':popover-open') return isMenuOpen;
    return matches(selector);
  }
  Object.defineProperty(menu, 'matches', { value: matchesWithPopover });
  menu.showPopover = () => setOpen(true);
  menu.hidePopover = () => setOpen(false);
}

function setup(): {
  host: HTMLElement;
  trigger: HTMLButtonElement;
  menu: HTMLElement;
  detach: () => void;
} {
  const host = document.createElement('div');
  host.innerHTML = `
    <nav data-behavior="dropdown">
      <ul>
        <li>
          <button type="button" popovertarget="sub-0" aria-expanded="false">Product</button>
          <ul id="sub-0" popover data-dropdown-menu>
            <li><a href="#tour">Tour</a></li>
            <li><a href="#pricing">Pricing</a></li>
            <li><a href="#changelog">Changelog</a></li>
          </ul>
        </li>
      </ul>
    </nav>`;
  document.body.append(host);
  const trigger = host.querySelector<HTMLButtonElement>('button');
  const menu = host.querySelector<HTMLElement>('#sub-0');
  if (trigger === null || menu === null) throw new Error('Incomplete fixture');
  fakePopover(menu);
  const detach = window.siteRuntime.attach(host);
  return { host, trigger, menu, detach };
}

function press(target: Element, key: string): void {
  target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('dropdown behavior', () => {
  it('opens with the down arrow, focuses the first link and syncs aria-expanded', () => {
    const { trigger } = setup();
    press(trigger, 'ArrowDown');
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(document.activeElement?.textContent).toBe('Tour');
  });

  it('moves between links with arrows and wraps, and opens at the last link with up', () => {
    const { trigger } = setup();
    press(trigger, 'ArrowUp');
    expect(document.activeElement?.textContent).toBe('Changelog');
    press(document.activeElement ?? trigger, 'ArrowDown');
    expect(document.activeElement?.textContent).toBe('Tour');
  });

  it('closes with Escape and returns focus to its button', () => {
    const { trigger, menu } = setup();
    press(trigger, 'ArrowDown');
    press(document.activeElement ?? menu, 'Escape');
    expect(menu.matches(':popover-open')).toBe(false);
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(trigger);
  });

  it('closes after a link inside it is chosen', () => {
    const { trigger, menu } = setup();
    press(trigger, 'ArrowDown');
    menu.querySelector('a')?.click();
    expect(menu.matches(':popover-open')).toBe(false);
  });

  it('closes an open menu on cleanup', () => {
    const { trigger, menu, detach } = setup();
    press(trigger, 'ArrowDown');
    detach();
    expect(menu.matches(':popover-open')).toBe(false);
  });
});
