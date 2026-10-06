import { act, useState, type JSX } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import type { Field } from '../../components/types';
import { ListField } from './ListField';

const list: Field = {
  name: 'items',
  label: 'Features',
  type: 'list',
  default: [],
  minItems: 1,
  maxItems: 2,
  itemLabel: 'title',
  itemFields: [
    { name: 'title', label: 'Title', type: 'text', default: 'New feature' },
    { name: 'showNote', label: 'Show note', type: 'boolean', default: false },
    {
      name: 'note',
      label: 'Note',
      type: 'text',
      default: '',
      visibleWhen: { field: 'showNote', equals: true },
    },
  ],
};

let root: Root | null = null;
let container: HTMLDivElement | null = null;
let latest: unknown = null;

function Harness({ initial }: { initial: unknown }): JSX.Element {
  const [value, setValue] = useState(initial);
  return (
    <ListField
      field={list}
      value={value}
      id="ve-field-items"
      path="items"
      describedBy={undefined}
      isInvalid={false}
      onChange={(next) => {
        latest = next;
        setValue(next);
      }}
    />
  );
}

function render(initial: unknown): HTMLDivElement {
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  act(() => root?.render(<Harness initial={initial} />));
  return container;
}

function button(element: HTMLElement, label: string): HTMLButtonElement {
  const found = element.querySelector(`button[aria-label="${label}"]`);
  if (!(found instanceof HTMLButtonElement)) throw new Error(`No button labelled ${label}`);
  return found;
}

describe('ListField', () => {
  beforeAll(() => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  });

  afterEach(() => {
    act(() => root?.unmount());
    container?.remove();
  });

  it('titles items, hides conditional item fields and respects min and max', () => {
    const element = render([{ title: 'Fast setup', showNote: false, note: '' }]);
    expect(element.querySelector('summary')?.textContent).toBe('Fast setup');
    expect(element.querySelector('[data-field-path="items.0.note"]')).toBeNull();
    expect(button(element, 'Remove Fast setup').disabled).toBe(true);

    const add = [...element.querySelectorAll('button')].find(
      (candidate) => candidate.textContent === 'Add item',
    );
    act(() => add?.click());
    expect(latest).toEqual([
      { title: 'Fast setup', showNote: false, note: '' },
      { title: 'New feature', showNote: false, note: '' },
    ]);
    expect(add?.disabled).toBe(true);
    expect(button(element, 'Duplicate Fast setup').disabled).toBe(true);
  });

  it('moves an item with Alt and the arrow keys', () => {
    const element = render([{ title: 'One' }, { title: 'Two' }]);
    const handle = button(element, 'Move One');
    act(() => {
      handle.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowDown', altKey: true, bubbles: true }),
      );
    });
    expect(latest).toEqual([{ title: 'Two' }, { title: 'One' }]);
  });
});
