import { describe, expect, it } from 'vitest';
import {
  addItem,
  defaultValues,
  duplicateItem,
  groupFields,
  isColorValue,
  isFieldVisible,
  itemTitle,
  moveItem,
  removeItem,
  validateField,
} from './fields';
import type { ComponentDefinition, Field } from './types';

function definitionWith(fields: Field[], fieldGroups?: string[]): ComponentDefinition {
  return {
    id: 'fixture',
    version: 1,
    name: 'Fixture',
    category: 'content',
    fields,
    fieldGroups,
    styleOverrides: [],
  };
}

describe('defaultValues', () => {
  it('deep-copies each field default', () => {
    const items = [{ title: 'One' }];
    const values = defaultValues([{ name: 'items', label: 'Items', type: 'list', default: items }]);
    expect(values.items).toEqual(items);
    expect(values.items).not.toBe(items);
  });
});

describe('groupFields', () => {
  it('orders groups by fieldGroups, then by first use, then ungrouped fields last', () => {
    const definition = definitionWith(
      [
        { name: 'c', label: 'C', type: 'text', default: '' },
        { name: 'a', label: 'A', type: 'text', default: '', group: 'Extra' },
        { name: 'b', label: 'B', type: 'text', default: '', group: 'Layout' },
        { name: 'd', label: 'D', type: 'text', default: '', group: 'Heading' },
      ],
      ['Heading', 'Empty', 'Layout'],
    );
    const groups = groupFields(definition).map(({ name, fields }) => ({
      name,
      fieldNames: fields.map((field) => field.name),
    }));
    expect(groups).toEqual([
      { name: 'Heading', fieldNames: ['d'] },
      { name: 'Layout', fieldNames: ['b'] },
      { name: 'Extra', fieldNames: ['a'] },
      { name: 'General', fieldNames: ['c'] },
    ]);
  });
});

describe('validateField', () => {
  const text: Field = { name: 'title', label: 'Title', type: 'text', default: '' };
  const number: Field = {
    name: 'count',
    label: 'Count',
    type: 'number',
    default: 1,
    min: 1,
    max: 9,
  };
  const date: Field = { name: 'published', label: 'Published', type: 'date', default: '' };
  const select: Field = {
    name: 'columns',
    label: 'Columns',
    type: 'select',
    default: '2',
    options: [
      { value: '2', label: '2' },
      { value: '3', label: '3' },
    ],
  };
  const image = {
    source: 'placeholder',
    src: '',
    alt: '',
    decorative: false,
    width: 1200,
    height: 900,
    placeholder: { ratio: '4:3', subject: 'photo' },
  };
  const imageField: Field = { name: 'image', label: 'Image', type: 'image', default: image };

  it.each([
    [{ ...text, required: true }, '  ', 'This field is required'],
    [{ ...text, maxLength: 3 }, 'Four', 'Use at most 3 characters'],
    [text, 'Fine', null],
    [{ ...text, type: 'richtext', required: true }, '<p> </p>', 'This field is required'],
    [number, Number.NaN, 'Enter a number'],
    [number, '1e', 'Enter a number'],
    [number, 0, 'Use 1 or more'],
    [number, 10, 'Use 9 or less'],
    [number, 5, null],
    [date, '', null],
    [date, '2026-02-30', 'Enter a valid date'],
    [date, '2026-02-28', null],
    [select, '5', 'Choose one of the options'],
    [select, '3', null],
    [imageField, image, 'Add alt text or mark the image as decorative'],
    [imageField, { ...image, decorative: true }, null],
    [imageField, { ...image, alt: 'Team at a whiteboard' }, null],
  ] satisfies [Field, unknown, string | null][])(
    '%o with %o gives %s',
    (field, value, expected) => {
      expect(validateField(field, value)).toBe(expected);
    },
  );
});

describe('isFieldVisible', () => {
  it('shows a field only when its condition field has the expected value', () => {
    const field: Field = {
      name: 'cta',
      label: 'Button',
      type: 'text',
      default: '',
      visibleWhen: { field: 'showCta', equals: true },
    };
    expect(isFieldVisible(field, { showCta: true })).toBe(true);
    expect(isFieldVisible(field, { showCta: false })).toBe(false);
    expect(isFieldVisible({ ...field, visibleWhen: undefined }, {})).toBe(true);
  });
});

describe('isColorValue', () => {
  it.each([
    ['var(--color-primary)', true],
    ['#fff', true],
    ['#4f46e5', true],
    ['#4f46e580', true],
    ['red', false],
    ['#12345', false],
    ['var(--color-primary); background: url(x)', false],
    [42, false],
  ])('%s is %s', (value, expected) => {
    expect(isColorValue(value)).toBe(expected);
  });
});

describe('list items', () => {
  const list: Field = {
    name: 'items',
    label: 'Features',
    type: 'list',
    default: [],
    minItems: 1,
    maxItems: 3,
    itemLabel: 'title',
    itemFields: [
      { name: 'title', label: 'Title', type: 'text', default: 'Feature title' },
      { name: 'tags', label: 'Tags', type: 'list', default: ['new'] },
    ],
  };
  const one = { title: 'One', tags: ['a'] };
  const two = { title: 'Two', tags: ['b'] };

  it('adds an item with the item defaults, up to maxItems', () => {
    expect(addItem(list, [one])).toEqual([one, { title: 'Feature title', tags: ['new'] }]);
    expect(addItem(list, [one, two, one])).toHaveLength(3);
  });

  it('removes an item, down to minItems', () => {
    expect(removeItem(list, [one, two], 0)).toEqual([two]);
    expect(removeItem(list, [one], 0)).toEqual([one]);
  });

  it('duplicates an item right after itself as a deep copy', () => {
    const copied = duplicateItem(list, [one, two], 0);
    expect(copied).toEqual([one, one, two]);
    expect(copied[1].tags).not.toBe(one.tags);
    expect(duplicateItem(list, [one, two, one], 0)).toHaveLength(3);
  });

  it('moves an item and clamps the target index', () => {
    expect(moveItem([one, two], 0, 1)).toEqual([two, one]);
    expect(moveItem([one, two], 1, -5)).toEqual([two, one]);
  });

  it('titles items by their label field, falling back to a number', () => {
    expect(itemTitle(list, one, 0)).toBe('One');
    expect(itemTitle(list, { title: '  ' }, 1)).toBe('Item 2');
  });
});
