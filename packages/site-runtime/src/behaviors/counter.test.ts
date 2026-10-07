import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '../core';
import './counter';

type ObserverCallback = (
  entries: Array<Pick<IntersectionObserverEntry, 'isIntersecting' | 'target'>>,
) => void;

let reportVisible: (target: Element) => void = () => {};

class FakeIntersectionObserver {
  private readonly targets = new Set<Element>();

  constructor(callback: ObserverCallback) {
    reportVisible = (target) => {
      if (this.targets.has(target)) callback([{ isIntersecting: true, target }]);
    };
  }

  observe(target: Element): void {
    this.targets.add(target);
  }

  unobserve(target: Element): void {
    this.targets.delete(target);
  }

  disconnect(): void {
    this.targets.clear();
  }
}

function setup(values: string[]): {
  host: HTMLElement;
  counters: HTMLElement[];
  detach: () => void;
} {
  const host = document.createElement('div');
  const spans = values.map((value) => `<span data-count>${value}</span>`).join('');
  host.innerHTML = `<section data-behavior="counter">${spans}</section>`;
  document.body.append(host);
  const detach = window.siteRuntime.attach(host);
  return { host, counters: [...host.querySelectorAll<HTMLElement>('[data-count]')], detach };
}

function texts(counters: HTMLElement[]): string[] {
  return counters.map((counter) => counter.textContent ?? '');
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  document.body.innerHTML = '';
});

describe('counter behavior', () => {
  it('starts at zero in the same format as the final number', () => {
    const { counters } = setup(['$2.4M', '12,000+', '4.9', '1.250 users', '99.9%', '24/7']);
    expect(texts(counters)).toEqual(['$0.0M', '0+', '0.0', '0 users', '0.0%', '0/7']);
  });

  it('counts up to the exact final text once the number is visible', () => {
    const { counters } = setup(['12,000+', '$2.4M']);
    for (const counter of counters) reportVisible(counter);
    vi.advanceTimersByTime(600);
    const halfway = Number((counters[0]?.textContent ?? '').replace(/\D/g, ''));
    expect(halfway).toBeGreaterThan(0);
    expect(halfway).toBeLessThan(12000);
    vi.advanceTimersByTime(1000);
    expect(texts(counters)).toEqual(['12,000+', '$2.4M']);
  });

  it('puts the final numbers back on cleanup and does not count again', () => {
    const { host, counters, detach } = setup(['900']);
    reportVisible(counters[0] ?? host);
    vi.advanceTimersByTime(2000);
    detach();
    window.siteRuntime.attach(host);
    expect(texts(counters)).toEqual(['900']);
  });

  it('leaves text without a number alone', () => {
    const { counters } = setup(['Always on']);
    expect(texts(counters)).toEqual(['Always on']);
  });
});
