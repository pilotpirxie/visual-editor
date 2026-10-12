import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, runInAct } from '../../test/dom';
import { TypedStatus } from './TypedStatus';

const TYPE_DELAY_MS = 32;
const ERASE_DELAY_MS = 14;
const HOLD_MS = 3500;
const WHOLE_PHRASE_MS = 4500;

function tick(delay: number, times = 1): void {
  for (let count = 0; count < times; count += 1) {
    runInAct(() => vi.advanceTimersByTime(delay));
  }
}

function typed(container: HTMLElement): string {
  return container.querySelector('.ve-typed-text')?.textContent ?? '';
}

function reduceMotion(): void {
  vi.spyOn(window, 'matchMedia').mockImplementation((media) => ({
    media,
    matches: true,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  }));
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('TypedStatus', () => {
  it('types a phrase, holds it, erases it and types the next one', () => {
    const { container } = render(<TypedStatus phrases={['Abc', 'Xy']} />);
    expect(typed(container)).toBe('');
    tick(TYPE_DELAY_MS);
    expect(typed(container)).toBe('A');
    tick(TYPE_DELAY_MS, 2);
    expect(typed(container)).toBe('Abc');
    tick(HOLD_MS - 1);
    expect(typed(container)).toBe('Abc');
    tick(1);
    tick(ERASE_DELAY_MS, 3);
    expect(typed(container)).toBe('');
    tick(TYPE_DELAY_MS, 3);
    expect(typed(container)).toBe('Xy');
    tick(HOLD_MS);
    tick(ERASE_DELAY_MS, 2);
    tick(TYPE_DELAY_MS, 2);
    expect(typed(container)).toBe('A');
  });

  it('keeps a single phrase on screen once it is typed', () => {
    const { container } = render(<TypedStatus phrases={['Abc']} />);
    tick(TYPE_DELAY_MS, 3);
    tick(HOLD_MS * 2);
    expect(typed(container)).toBe('Abc');
    expect(vi.getTimerCount()).toBe(0);
  });

  it('is hidden from screen readers, so letters are not read out one by one', () => {
    const { container } = render(<TypedStatus phrases={['Abc', 'Xy']} />);
    tick(TYPE_DELAY_MS, 2);
    expect(container.querySelector('.ve-typed')?.getAttribute('aria-hidden')).toBe('true');
    expect(container.querySelector('[role="status"]')).toBeNull();
  });

  it('swaps whole phrases without typing when motion is reduced', () => {
    reduceMotion();
    const { container } = render(<TypedStatus phrases={['Abc', 'Xy']} />);
    expect(typed(container)).toBe('Abc');
    tick(WHOLE_PHRASE_MS);
    expect(typed(container)).toBe('Xy');
    tick(WHOLE_PHRASE_MS);
    expect(typed(container)).toBe('Abc');
  });
});
