import { afterEach, describe, expect, it } from 'vitest';
import '../core';
import './tabs';

const MARKUP = `
  <section data-behavior="tabs">
    <div role="tablist" aria-label="Features" hidden>
      <button type="button" id="t-0" aria-controls="p-0">Plan</button>
      <button type="button" id="t-1" aria-controls="p-1">Track</button>
      <button type="button" id="t-2" aria-controls="p-2">Share</button>
    </div>
    <div id="p-0">Plan panel</div>
    <div id="p-1">Track panel</div>
    <div id="p-2">Share panel</div>
  </section>`;

function setup(): { host: HTMLElement; detach: () => void } {
  const host = document.createElement('div');
  host.innerHTML = MARKUP;
  document.body.append(host);
  const detach = window.siteRuntime.attach(host);
  return { host, detach };
}

function tab(host: HTMLElement, index: number): HTMLElement {
  const element = host.querySelector<HTMLElement>(`#t-${index}`);
  if (element === null) throw new Error(`No tab ${index}`);
  return element;
}

function panelsShown(host: HTMLElement): string[] {
  const shown: string[] = [];
  for (const panel of host.querySelectorAll<HTMLElement>('[id^="p-"]')) {
    if (!panel.hidden) shown.push(panel.id);
  }
  return shown;
}

afterEach(() => {
  document.body.innerHTML = '';
  window.location.hash = '';
});

describe('tabs behavior', () => {
  it('turns stacked panels into ARIA tabs with the first one selected', () => {
    const { host } = setup();
    expect(host.querySelector<HTMLElement>('[role="tablist"]')?.hidden).toBe(false);
    expect(tab(host, 0).getAttribute('role')).toBe('tab');
    expect(tab(host, 0).getAttribute('aria-selected')).toBe('true');
    expect(tab(host, 1).tabIndex).toBe(-1);
    expect(host.querySelector('#p-1')?.getAttribute('aria-labelledby')).toBe('t-1');
    expect(panelsShown(host)).toEqual(['p-0']);
  });

  it('selects a tab by click and moves with arrow, Home and End keys', () => {
    const { host } = setup();
    tab(host, 2).click();
    expect(panelsShown(host)).toEqual(['p-2']);
    tab(host, 2).dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    expect(panelsShown(host)).toEqual(['p-0']);
    expect(document.activeElement).toBe(tab(host, 0));
    tab(host, 0).dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));
    expect(panelsShown(host)).toEqual(['p-2']);
  });

  it('opens the tab named in the address hash', () => {
    window.location.hash = '#p-1';
    const { host } = setup();
    expect(panelsShown(host)).toEqual(['p-1']);
  });

  it('restores the plain panels on cleanup and remembers the tab when attached again', () => {
    const { host, detach } = setup();
    tab(host, 1).click();
    detach();
    expect(panelsShown(host)).toEqual(['p-0', 'p-1', 'p-2']);
    expect(host.querySelector<HTMLElement>('[role="tablist"]')?.hidden).toBe(true);
    window.siteRuntime.attach(host);
    expect(panelsShown(host)).toEqual(['p-1']);
  });
});
