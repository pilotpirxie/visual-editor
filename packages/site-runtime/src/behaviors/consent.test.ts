import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '../core';
import './consent';

const MARKUP = `
  <aside data-behavior="consent">
    <dialog><p>We use cookies.</p>
      <button type="button" data-consent="declined">Decline</button>
      <button type="button" data-consent="accepted">Accept</button>
    </dialog>
  </aside>`;

function setup(): { host: HTMLElement; dialog: HTMLDialogElement; detach: () => void } {
  const host = document.createElement('div');
  host.innerHTML = MARKUP;
  document.body.append(host);
  const dialog = host.querySelector('dialog');
  if (dialog === null) throw new Error('fixture has no dialog');
  const detach = window.siteRuntime.attach(host);
  return { host, dialog, detach };
}

function choose(host: HTMLElement, choice: string): void {
  host.querySelector<HTMLElement>(`[data-consent="${choice}"]`)?.click();
}

const realStorage = window.siteRuntime.storage;

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  window.siteRuntime.storage = realStorage;
});

describe('consent behavior', () => {
  it('shows the banner until a choice is made and remembers it', () => {
    const first = setup();
    expect(first.dialog.open).toBe(true);
    choose(first.host, 'accepted');
    expect(first.dialog.open).toBe(false);
    expect(window.localStorage.getItem('site-consent')).toBe('accepted');
    const later = setup();
    expect(later.dialog.open).toBe(false);
  });

  it('remembers a declined choice too', () => {
    const { host } = setup();
    choose(host, 'declined');
    expect(window.localStorage.getItem('site-consent')).toBe('declined');
  });

  it('keeps working when the browser refuses storage', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('denied', 'SecurityError');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('denied', 'SecurityError');
    });
    const { host, dialog } = setup();
    expect(dialog.open).toBe(true);
    choose(host, 'accepted');
    expect(dialog.open).toBe(false);
    expect(warn).toHaveBeenCalledTimes(2);
  });

  it('uses the storage it is given, so the editor can keep choices out of the browser', () => {
    window.siteRuntime.storage = { getItem: () => null, setItem: () => {} };
    const { host } = setup();
    choose(host, 'accepted');
    expect(window.localStorage.getItem('site-consent')).toBeNull();
    expect(setup().dialog.open).toBe(true);
  });
});
