import { afterEach, describe, expect, it, vi } from 'vitest';
import '../core';
import './analytics';

function attach(service: string, id: string): () => void {
  const host = document.createElement('div');
  host.dataset.behavior = 'analytics';
  host.dataset.analyticsService = service;
  host.dataset.analyticsId = id;
  document.body.append(host);
  return window.siteRuntime.attach(host);
}

function loadedScripts(): HTMLScriptElement[] {
  return [...document.head.querySelectorAll('script')];
}

afterEach(() => {
  for (const script of loadedScripts()) script.remove();
  document.body.replaceChildren();
  vi.restoreAllMocks();
});

describe('analytics behavior', () => {
  it.each([
    ['plausible', 'example.com', 'https://plausible.io/js/script.js', 'data-domain', 'example.com'],
    [
      'goatcounter',
      'mysite',
      'https://gc.zgo.at/count.js',
      'data-goatcounter',
      'https://mysite.goatcounter.com/count',
    ],
    [
      'cloudflare',
      'abc123',
      'https://static.cloudflareinsights.com/beacon.min.js',
      'data-cf-beacon',
      '{"token":"abc123"}',
    ],
  ])('loads the %s script with the site id', (service, id, src, attribute, value) => {
    attach(service, id);
    const [script] = loadedScripts();
    expect(script?.src).toBe(src);
    expect(script?.async).toBe(true);
    expect(script?.getAttribute(attribute)).toBe(value);
  });

  it('removes the script when the behavior stops', () => {
    const detach = attach('plausible', 'example.com');
    expect(loadedScripts()).toHaveLength(1);
    detach();
    expect(loadedScripts()).toHaveLength(0);
  });

  it('loads nothing for an unknown service or a missing id', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    attach('tracker', 'example.com');
    attach('plausible', '');
    expect(loadedScripts()).toHaveLength(0);
    expect(warn).toHaveBeenCalledTimes(2);
  });
});
