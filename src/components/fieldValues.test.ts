import { describe, expect, it } from 'vitest';
import { forEachFieldValue, mapFieldValues } from './fieldValues';
import type { Field } from './types';

const FIELDS: Field[] = [
  { name: 'title', label: 'Title', type: 'text', default: '' },
  {
    name: 'items',
    label: 'Items',
    type: 'list',
    default: [],
    itemFields: [{ name: 'label', label: 'Label', type: 'text', default: '' }],
  },
];

describe('forEachFieldValue', () => {
  it('visits top-level fields, the list itself and every list item field', () => {
    const visited: string[] = [];
    forEachFieldValue(
      FIELDS,
      { title: 'A', items: [{ label: 'B' }, { label: 'C' }] },
      (field, value) => {
        visited.push(`${field.name}=${Array.isArray(value) ? 'list' : String(value)}`);
      },
    );
    expect(visited).toEqual(['title=A', 'items=list', 'label=B', 'label=C']);
  });
});

describe('mapFieldValues', () => {
  it('maps values inside lists and returns new objects', () => {
    const values = { title: 'a', items: [{ label: 'b' }], extra: 1 };
    const mapped = mapFieldValues(FIELDS, values, (_field, value) =>
      typeof value === 'string' ? value.toUpperCase() : value,
    );
    expect(mapped).toEqual({ title: 'A', items: [{ label: 'B' }], extra: 1 });
    expect(values.items[0]?.label).toBe('b');
  });

  it('leaves missing fields and lists that are not arrays alone', () => {
    const mapped = mapFieldValues(FIELDS, { items: 'broken' }, () => 'changed');
    expect(mapped).toEqual({ items: 'broken' });
  });
});
