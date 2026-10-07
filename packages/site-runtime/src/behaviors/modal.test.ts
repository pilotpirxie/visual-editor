import { afterEach, describe, expect, it, vi } from 'vitest';
import '../core';
import './modal';

const MARKUP = `
  <a id="opener" href="#signup">Join</a>
  <a id="elsewhere" href="#pricing">Pricing</a>
  <div id="signup" data-behavior="modal">
    <dialog id="signup-dialog"><p>Join the beta</p><button id="inside" type="button">Ok</button></dialog>
  </div>`;

const detachers: Array<() => void> = [];

function setup(): { host: HTMLElement; dialog: HTMLDialogElement; detach: () => void } {
  const host = document.createElement('div');
  host.innerHTML = MARKUP;
  document.body.append(host);
  const dialog = host.querySelector('dialog');
  if (dialog === null) throw new Error('fixture has no dialog');
  const detach = window.siteRuntime.attach(host);
  detachers.push(detach);
  return { host, dialog, detach };
}

function element(host: HTMLElement, selector: string): HTMLElement {
  const found = host.querySelector<HTMLElement>(selector);
  if (found === null) throw new Error(`No ${selector}`);
  return found;
}

afterEach(() => {
  for (const detach of detachers.splice(0)) detach();
  window.location.hash = '';
  document.documentElement.style.overflow = '';
});

describe('modal behavior', () => {
  it('opens from a link to its anchor, locks the scroll and keeps the page where it is', () => {
    const { host, dialog } = setup();
    const click = new MouseEvent('click', { bubbles: true, cancelable: true });
    element(host, '#opener').dispatchEvent(click);
    expect(dialog.open).toBe(true);
    expect(click.defaultPrevented).toBe(true);
    expect(document.documentElement.style.overflow).toBe('hidden');
  });

  it('ignores links to other anchors and clicks something else already handled', () => {
    const { host, dialog } = setup();
    element(host, '#elsewhere').click();
    expect(dialog.open).toBe(false);
    const handled = new MouseEvent('click', { bubbles: true, cancelable: true });
    handled.preventDefault();
    element(host, '#opener').dispatchEvent(handled);
    expect(dialog.open).toBe(false);
  });

  it('closes on a backdrop click, unlocks the scroll and returns focus to the link', () => {
    const { host, dialog } = setup();
    const opener = element(host, '#opener');
    opener.click();
    vi.spyOn(dialog, 'getBoundingClientRect').mockReturnValue(new DOMRect(100, 100, 200, 200));
    dialog.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: 50, clientY: 50 }));
    expect(dialog.open).toBe(false);
    expect(document.documentElement.style.overflow).toBe('');
    expect(document.activeElement).toBe(opener);
  });

  it('stays open when the click lands inside the dialog', () => {
    const { host, dialog } = setup();
    element(host, '#opener').click();
    vi.spyOn(dialog, 'getBoundingClientRect').mockReturnValue(new DOMRect(100, 100, 200, 200));
    dialog.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: 150, clientY: 150 }));
    expect(dialog.open).toBe(true);
  });

  it('opens on load when the address points at it', () => {
    window.location.hash = '#signup';
    const { dialog } = setup();
    expect(dialog.open).toBe(true);
  });

  it('closes and lets go of the page when detached', () => {
    const { host, dialog, detach } = setup();
    element(host, '#opener').click();
    detach();
    expect(dialog.open).toBe(false);
    expect(document.documentElement.style.overflow).toBe('');
    element(host, '#opener').click();
    expect(dialog.open).toBe(false);
  });
});
