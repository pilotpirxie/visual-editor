import { describe, expect, it } from 'vitest';
import { CATEGORIES, categoryLabel } from './types';

describe('categoryLabel', () => {
  it('names every category', () => {
    for (const category of CATEGORIES) {
      expect(categoryLabel(category.id)).toBe(category.label);
    }
    expect(categoryLabel('navigations')).toBe('Navigations');
  });

  it('has no label for a category that does not exist', () => {
    expect(categoryLabel('widgets')).toBeNull();
    expect(categoryLabel('')).toBeNull();
    expect(categoryLabel('Navigations')).toBeNull();
  });
});
