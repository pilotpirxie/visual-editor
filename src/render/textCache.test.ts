import { describe, expect, it, vi } from 'vitest';
import { cachedByText } from './textCache';

describe('cachedByText', () => {
  it('computes each text once and returns the stored result after that', () => {
    const compute = vi.fn((text: string) => text.toUpperCase());
    const upper = cachedByText(2, compute);
    expect(upper('a')).toBe('A');
    expect(upper('a')).toBe('A');
    expect(compute).toHaveBeenCalledTimes(1);
  });

  it('forgets the least recently used text once it is full', () => {
    const compute = vi.fn((text: string) => text.length);
    const length = cachedByText(2, compute);
    length('a');
    length('bb');
    length('a');
    length('ccc');
    length('a');
    length('bb');
    expect(compute.mock.calls.map(([text]) => text)).toEqual(['a', 'bb', 'ccc', 'bb']);
  });
});
