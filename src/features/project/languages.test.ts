import { afterEach, describe, expect, it, vi } from 'vitest';
import type { FieldOption } from '../../components/types';
import { languageOptions } from './languages';

const BUNDLED_LANGUAGE_COUNT = 42;

function valuesOf(options: FieldOption[]): string[] {
  const values: string[] = [];
  for (const option of options) values.push(option.value);
  return values;
}

function labelsOf(options: FieldOption[]): string[] {
  const labels: string[] = [];
  for (const option of options) labels.push(option.label);
  return labels;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('languageOptions', () => {
  it('labels each language with its English name and its code', () => {
    const options = languageOptions('en');
    const english = options.find((option) => option.value === 'en');
    const british = options.find((option) => option.value === 'en-GB');
    expect(english?.label).toBe('English (en)');
    expect(british?.label).toBe('British English (en-GB)');
  });

  it('lists every bundled language once when the current code is one of them', () => {
    const values = valuesOf(languageOptions('pl'));
    expect(values).toHaveLength(BUNDLED_LANGUAGE_COUNT);
    expect(new Set(values).size).toBe(BUNDLED_LANGUAGE_COUNT);
    expect(values).toContain('pl');
  });

  it('sorts the options alphabetically by label', () => {
    const labels = labelsOf(languageOptions('en'));
    const sorted = [...labels].sort((left, right) => left.localeCompare(right));
    expect(labels).toEqual(sorted);
  });

  it('adds a valid current code that is not in the bundled list', () => {
    const options = languageOptions('fil');
    expect(options).toHaveLength(BUNDLED_LANGUAGE_COUNT + 1);
    expect(options).toContainEqual({ value: 'fil', label: 'Filipino (fil)' });
  });

  it('sorts an added current code among the others instead of putting it first', () => {
    const labels = labelsOf(languageOptions('fil'));
    const sorted = [...labels].sort((left, right) => left.localeCompare(right));
    expect(labels).toEqual(sorted);
  });

  it('falls back to the bare code and warns when the current code is not a language tag', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const options = languageOptions('!!');
    expect(options).toContainEqual({ value: '!!', label: '!!' });
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0]?.[0]).toBe('Unknown language code "!!"');
  });

  it('does not warn for bundled codes', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    languageOptions('en');
    expect(warn).not.toHaveBeenCalled();
  });

  it('returns a new list on every call', () => {
    const first = languageOptions('en');
    first.pop();
    expect(languageOptions('en')).toHaveLength(BUNDLED_LANGUAGE_COUNT);
  });
});
