import { beforeAll, describe, expect, it, vi } from 'vitest';
import './core';

describe('site runtime core', () => {
  beforeAll(() => {
    window.siteRuntime.register({
      name: 'mark',
      init(root) {
        root.dataset.count = String(Number(root.dataset.count ?? 0) + 1);
        return () => root.removeAttribute('data-count');
      },
    });
  });

  it('initialises each behavior element once, including the root itself', () => {
    const host = document.createElement('div');
    host.innerHTML = '<section data-behavior="mark"><p data-behavior="mark"></p></section>';
    const section = host.querySelector<HTMLElement>('section');
    if (!section) throw new Error('fixture has no section');
    window.siteRuntime.attach(host);
    window.siteRuntime.attach(section);
    expect(section.dataset.count).toBe('1');
    expect(section.querySelector('p')?.dataset.count).toBe('1');
  });

  it('cleans up what it attached so the canvas can re-attach after a render', () => {
    const host = document.createElement('div');
    host.innerHTML = '<nav data-behavior="mark"></nav>';
    const detach = window.siteRuntime.attach(host);
    detach();
    expect(host.firstElementChild?.hasAttribute('data-count')).toBe(false);
    window.siteRuntime.attach(host);
    expect(host.firstElementChild?.getAttribute('data-count')).toBe('1');
  });

  it('keeps starting other behaviors when one of them fails', () => {
    window.siteRuntime.register({
      name: 'broken',
      init() {
        throw new Error('broken on purpose');
      },
    });
    const errors: unknown[] = [];
    vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
      errors.push(args[0]);
    });
    const host = document.createElement('div');
    host.innerHTML =
      '<nav data-behavior="broken mark"></nav><footer data-behavior="mark"></footer>';
    window.siteRuntime.attach(host);
    expect(host.querySelector('nav')?.getAttribute('data-count')).toBe('1');
    expect(host.querySelector('footer')?.getAttribute('data-count')).toBe('1');
    expect(errors).toEqual(['siteRuntime: behavior "broken" failed to start']);
  });

  it('warns about behaviors it does not know', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const host = document.createElement('div');
    host.innerHTML = '<div data-behavior="unknown"></div>';
    window.siteRuntime.attach(host);
    expect(warn).toHaveBeenCalledOnce();
  });
});
