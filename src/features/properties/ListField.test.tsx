import { useState, type JSX } from 'react';
import { describe, expect, it } from 'vitest';
import type { EditKind } from '../../app/projectSlice';
import type { Field } from '../../components/types';
import { changeValue, click, firePointer, getButton, pressKey, render } from '../../test/dom';
import { dragController } from '../canvas/dragController';
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

const roomyList: Field = { ...list, minItems: 0, maxItems: 5 };

type Change = { value: unknown; kind: EditKind };

function renderList(
  field: Field,
  initial: unknown,
): { element: HTMLDivElement; changes: Change[] } {
  const changes: Change[] = [];

  function Harness(): JSX.Element {
    const [value, setValue] = useState(initial);
    return (
      <ListField
        field={field}
        value={value}
        id="ve-field-items"
        path="items"
        describedBy={undefined}
        isInvalid={false}
        onChange={(next, kind) => {
          changes.push({ value: next, kind });
          setValue(next);
        }}
      />
    );
  }

  return { element: render(<Harness />).container, changes };
}

function nextFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

function openDetails(element: HTMLElement): string[] {
  const titles: string[] = [];
  for (const details of element.querySelectorAll('details')) {
    if (details.open) titles.push(details.querySelector('summary')?.textContent ?? '');
  }
  return titles;
}

describe('ListField', () => {
  it('titles items, hides conditional item fields and respects min and max', () => {
    const { element, changes } = renderList(list, [
      { title: 'Fast setup', showNote: false, note: '' },
    ]);
    expect(element.querySelector('summary')?.textContent).toBe('Fast setup');
    expect(element.querySelector('[data-field-path="items.0.note"]')).toBeNull();
    expect(getButton(element, 'Remove Fast setup').disabled).toBe(true);

    const add = getButton(element, 'Add item');
    click(add);
    expect(changes.at(-1)).toEqual({
      value: [
        { title: 'Fast setup', showNote: false, note: '' },
        { title: 'New feature', showNote: false, note: '' },
      ],
      kind: 'discrete',
    });
    expect(add.disabled).toBe(true);
    expect(getButton(element, 'Duplicate Fast setup').disabled).toBe(true);
  });

  it('moves an item with Alt and the arrow keys as one discrete change', () => {
    const { element, changes } = renderList(list, [{ title: 'One' }, { title: 'Two' }]);
    pressKey(getButton(element, 'Move One'), 'ArrowDown', { altKey: true });
    expect(changes.at(-1)).toEqual({
      value: [{ title: 'Two' }, { title: 'One' }],
      kind: 'discrete',
    });
  });

  it('ignores arrow keys without Alt and moves past either end', () => {
    const { element, changes } = renderList(list, [{ title: 'One' }, { title: 'Two' }]);
    pressKey(getButton(element, 'Move One'), 'ArrowDown');
    pressKey(getButton(element, 'Move One'), 'ArrowUp', { altKey: true });
    expect(changes).toHaveLength(0);
  });

  it('reports typing inside an item as a continuous change of the whole list', () => {
    const { element, changes } = renderList(list, [{ title: 'One' }, { title: 'Two' }]);
    changeValue(element.querySelector('[data-field-path="items.1.title"] textarea'), 'Second');
    expect(changes.at(-1)).toEqual({
      value: [{ title: 'One' }, { title: 'Second' }],
      kind: 'continuous',
    });
  });

  it('keeps an open item open when it moves to another position', () => {
    const { element } = renderList(roomyList, [
      { title: 'One' },
      { title: 'Two' },
      { title: 'Three' },
    ]);
    const details = element.querySelectorAll('details');
    details[0].open = true;
    pressKey(getButton(element, 'Move One'), 'ArrowDown', { altKey: true });
    pressKey(getButton(element, 'Move One'), 'ArrowDown', { altKey: true });
    expect(openDetails(element)).toEqual(['One']);
  });

  it('keeps an open item open after an item above it is removed', () => {
    const { element } = renderList(roomyList, [{ title: 'One' }, { title: 'Two' }]);
    element.querySelectorAll('details')[1].open = true;
    click(getButton(element, 'Remove One'));
    expect(openDetails(element)).toEqual(['Two']);
  });

  it('keeps an item open while typing changes its title', () => {
    const { element } = renderList(roomyList, [{ title: 'One' }]);
    element.querySelectorAll('details')[0].open = true;
    changeValue(element.querySelector('[data-field-path="items.0.title"] textarea'), 'Uno');
    expect(openDetails(element)).toEqual(['Uno']);
  });

  it('opens and focuses the first item added to an empty list', async () => {
    const { element } = renderList(roomyList, []);
    click(getButton(element, 'Add item'));
    await nextFrame();
    expect(openDetails(element)).toEqual(['New feature']);
    expect(document.activeElement).toBe(
      element.querySelector('[data-field-path="items.0.title"] textarea'),
    );
  });

  it('duplicates an item right after itself', () => {
    const { element, changes } = renderList(roomyList, [{ title: 'One' }, { title: 'Two' }]);
    click(getButton(element, 'Duplicate One'));
    expect(changes.at(-1)).toEqual({
      value: [{ title: 'One' }, { title: 'One' }, { title: 'Two' }],
      kind: 'discrete',
    });
  });

  it('removes an item as one discrete change', () => {
    const { element, changes } = renderList(roomyList, [{ title: 'One' }, { title: 'Two' }]);
    click(getButton(element, 'Remove One'));
    expect(changes).toEqual([{ value: [{ title: 'Two' }], kind: 'discrete' }]);
    expect(element.querySelectorAll('.ve-list-item')).toHaveLength(1);
  });

  it('shows no list for no items and still lets one be added', () => {
    const { element } = renderList(roomyList, []);
    expect(element.querySelector('.ve-list-items')).toBeNull();
    expect(getButton(element, 'Add item').disabled).toBe(false);
    expect(element.querySelector('#ve-field-items-label')?.textContent).toBe('Features');
  });

  it('treats a value that is not a list as an empty list', () => {
    const { element } = renderList(roomyList, 'not a list');
    expect(element.querySelectorAll('.ve-list-item')).toHaveLength(0);
  });

  it('counts the items against the most a list can hold, and says nothing without a limit', () => {
    const limited = renderList(list, [{ title: 'One' }]);
    expect(limited.element.querySelector('.ui-muted')?.textContent).toBe('1 of 2 items');
    const unlimited = renderList({ ...list, maxItems: undefined }, [{ title: 'One' }]);
    expect(unlimited.element.querySelector('.ui-muted')).toBeNull();
  });

  it('marks every item and item field with its path so the canvas can focus it', () => {
    const { element } = renderList(roomyList, [{ title: 'One' }, { title: 'Two' }]);
    const items = [...element.querySelectorAll('.ve-list-item')];
    expect(items.map((item) => item.getAttribute('data-field-path'))).toEqual([
      'items.0',
      'items.1',
    ]);
    expect(element.querySelector('[data-field-path="items.1.title"]')).not.toBeNull();
  });

  it('starts dragging an item from its handle, named after the item', () => {
    const { element } = renderList(roomyList, [{ title: 'One' }, { title: 'Two' }]);
    firePointer(getButton(element, 'Move Two'), 'pointerdown', {
      clientX: 10,
      clientY: 10,
      button: 0,
      pointerType: 'mouse',
    });
    firePointer(window, 'pointermove', { clientX: 10, clientY: 80, buttons: 1 });
    expect(dragController.isActive()).toBe(true);
    expect(dragController.getSnapshot()?.payload).toEqual({
      kind: 'list-item',
      ownerKey: 'items',
      index: 1,
      label: 'Two',
    });
    firePointer(window, 'pointerup', { clientX: 10, clientY: 80, buttons: 0 });
    expect(dragController.isActive()).toBe(false);
  });

  it('does not move the first item up or the last item down', () => {
    const { element, changes } = renderList(roomyList, [{ title: 'One' }, { title: 'Two' }]);
    pressKey(getButton(element, 'Move One'), 'ArrowUp', { altKey: true });
    pressKey(getButton(element, 'Move Two'), 'ArrowDown', { altKey: true });
    expect(changes).toEqual([]);
  });
});
