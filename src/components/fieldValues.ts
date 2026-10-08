import { asListItems, fitsField, type ListItem } from './fields';
import type { Field } from './types';

export type FieldVisitor = (field: Field, value: unknown) => void;

export type FieldMapper = (field: Field, value: unknown) => unknown;

export type FittedValues = { values: Record<string, unknown>; removed: string[]; reset: string[] };

export function forEachFieldValue(
  fields: readonly Field[],
  values: Record<string, unknown>,
  visit: FieldVisitor,
): void {
  for (const field of fields) {
    const value = values[field.name];
    visit(field, value);
    if (field.type !== 'list') continue;
    for (const item of asListItems(value)) forEachFieldValue(field.itemFields ?? [], item, visit);
  }
}

export function mapFieldValues(
  fields: readonly Field[],
  values: Record<string, unknown>,
  map: FieldMapper,
): Record<string, unknown> {
  const mapped: Record<string, unknown> = { ...values };
  for (const field of fields) {
    if (!(field.name in values)) continue;
    const value = values[field.name];
    if (field.type !== 'list') {
      mapped[field.name] = map(field, value);
      continue;
    }
    if (!Array.isArray(value)) continue;
    const items: ListItem[] = [];
    for (const item of asListItems(value)) {
      items.push(mapFieldValues(field.itemFields ?? [], item, map));
    }
    mapped[field.name] = items;
  }
  return mapped;
}

export function fitValues(fields: readonly Field[], values: Record<string, unknown>): FittedValues {
  const names = new Set(fields.map(({ name }) => name));
  const removed = Object.keys(values).filter((name) => !names.has(name));
  const reset: string[] = [];
  const fitted: Record<string, unknown> = {};
  for (const field of fields) {
    const value = values[field.name];
    if (value === undefined || !fitsField(field, value)) {
      if (value !== undefined) reset.push(field.name);
      fitted[field.name] = structuredClone(field.default);
      continue;
    }
    fitted[field.name] =
      field.type === 'list'
        ? asListItems(value).map((item) => fitValues(field.itemFields ?? [], item).values)
        : value;
  }
  return { values: fitted, removed, reset };
}
