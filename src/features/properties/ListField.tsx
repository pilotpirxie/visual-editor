import { useRef, useState, type JSX, type KeyboardEvent, type RefObject } from 'react';
import type { EditKind } from '../../app/projectSlice';
import {
  addItem,
  asListItems,
  canAddItem,
  canRemoveItem,
  duplicateItem,
  isFieldVisible,
  itemTitle,
  moveItem,
  removeItem,
  replaceItem,
  type ListItem,
} from '../../components/fields';
import type { Field } from '../../components/types';
import { dragController, type DragPayload } from '../canvas/dragController';
import { dropEdgeAt, finalMoveIndex } from '../canvas/geometry';
import { useListDropTarget } from '../canvas/useListDropTarget';
import { Icon } from '../editor/Icon';
import { FieldControl, type ControlProps } from './FieldControl';

const DROP_EDGE_MARGIN = 8;
const ITEM_HANDLE = '.ve-list-handle';
const ITEM_FIRST_INPUT = 'input, textarea, select, [contenteditable="true"]';

type ItemKeys = { keyOf(item: object): string; carry(from: object, to: object): void };

function createItemKeys(): ItemKeys {
  const keys = new WeakMap<object, string>();
  let createdCount = 0;

  function keyOf(item: object): string {
    const known = keys.get(item);
    if (known !== undefined) return known;
    createdCount += 1;
    const created = `item-${createdCount}`;
    keys.set(item, created);
    return created;
  }

  function carry(from: object, to: object): void {
    keys.set(to, keyOf(from));
  }

  return { keyOf, carry };
}

function uniqueItemKeys(itemKeys: ItemKeys, items: readonly ListItem[]): string[] {
  const used = new Set<string>();
  const keys: string[] = [];
  for (const [index, item] of items.entries()) {
    let key = itemKeys.keyOf(item);
    if (used.has(key)) key = `${key}-copy-${index}`;
    used.add(key);
    keys.push(key);
  }
  return keys;
}

function focusItemLater(
  listRef: RefObject<HTMLElement | null>,
  index: number,
  target: 'handle' | 'first-input',
): void {
  requestAnimationFrame(() => {
    const list = listRef.current;
    if (list === null) return;
    const item = list.children[index];
    if (item === undefined) return;
    if (target === 'handle') {
      item.querySelector<HTMLElement>(ITEM_HANDLE)?.focus();
      return;
    }
    const details = item.querySelector('details');
    if (details !== null) details.open = true;
    item.querySelector<HTMLElement>(ITEM_FIRST_INPUT)?.focus();
  });
}

function visibleItemFields(itemFields: Field[], item: ListItem): Field[] {
  const visible: Field[] = [];
  for (const itemField of itemFields) {
    if (isFieldVisible(itemField, item)) visible.push(itemField);
  }
  return visible;
}

export function ListField({ field, value, id, path, onChange }: ControlProps): JSX.Element {
  const items = asListItems(value);
  const listRef = useRef<HTMLOListElement>(null);
  const [itemKeys] = useState(createItemKeys);
  const labelId = `${id}-label`;
  const canAdd = canAddItem(field, items);
  const canRemove = canRemoveItem(field, items);
  const itemFields = field.itemFields ?? [];
  const keys = uniqueItemKeys(itemKeys, items);

  function isOwnItem(payload: DragPayload): boolean {
    return payload.kind === 'list-item' && payload.ownerKey === path;
  }

  const dropIndex = useListDropTarget({
    listRef,
    edgeMargin: DROP_EDGE_MARGIN,
    accepts: isOwnItem,
    isNoopDrop(payload, index) {
      if (payload.kind !== 'list-item') return true;
      return finalMoveIndex(payload.index, index) === payload.index;
    },
    drop(payload, index) {
      if (payload.kind !== 'list-item') return;
      const to = finalMoveIndex(payload.index, index);
      if (to !== payload.index) onChange(moveItem(items, payload.index, to), 'discrete');
    },
  });

  function moveWithKeyboard(event: KeyboardEvent<HTMLButtonElement>, index: number): void {
    const isArrow = event.key === 'ArrowUp' || event.key === 'ArrowDown';
    if (!event.altKey || !isArrow) return;
    event.preventDefault();
    const to = event.key === 'ArrowUp' ? index - 1 : index + 1;
    if (to < 0 || to >= items.length) return;
    onChange(moveItem(items, index, to), 'discrete');
    focusItemLater(listRef, to, 'handle');
  }

  function add(): void {
    onChange(addItem(field, items), 'discrete');
    focusItemLater(listRef, items.length, 'first-input');
  }

  function changeItemField(index: number, name: string, next: unknown, kind: EditKind): void {
    const item = items[index];
    const nextItem = { ...item, [name]: next };
    itemKeys.carry(item, nextItem);
    onChange(replaceItem(items, index, nextItem), kind);
  }

  return (
    <div className="ve-list">
      <span className="ve-control-label" id={labelId}>
        {field.label}
      </span>
      {items.length > 0 && (
        <ol className="ve-list-items" ref={listRef} aria-labelledby={labelId}>
          {items.map((item, index) => {
            const title = itemTitle(field, item, index);
            const itemPath = `${path}.${index}`;
            return (
              <li
                key={keys[index]}
                className="ve-list-item"
                data-field-path={itemPath}
                data-drop={dropEdgeAt(dropIndex, index, items.length) ?? undefined}
              >
                <details>
                  <summary className="ve-list-item-summary">{title}</summary>
                  <div className="ve-list-item-fields">
                    {visibleItemFields(itemFields, item).map((itemField) => (
                      <FieldControl
                        key={itemField.name}
                        field={itemField}
                        value={item[itemField.name]}
                        path={`${itemPath}.${itemField.name}`}
                        onChange={(next, kind) =>
                          changeItemField(index, itemField.name, next, kind)
                        }
                      />
                    ))}
                  </div>
                </details>
                <div className="ve-list-item-actions">
                  <button
                    type="button"
                    className="ve-icon-button ve-list-handle"
                    aria-label={`Move ${title}`}
                    title="Drag to reorder, or press Alt with an arrow key"
                    onPointerDown={(event) =>
                      dragController.start(
                        { kind: 'list-item', ownerKey: path, index, label: title },
                        event,
                      )
                    }
                    onKeyDown={(event) => moveWithKeyboard(event, index)}
                  >
                    <Icon name="grip" />
                  </button>
                  <button
                    type="button"
                    className="ve-icon-button"
                    aria-label={`Duplicate ${title}`}
                    title="Duplicate"
                    disabled={!canAdd}
                    onClick={() => onChange(duplicateItem(field, items, index), 'discrete')}
                  >
                    <Icon name="copy" />
                  </button>
                  <button
                    type="button"
                    className="ve-icon-button"
                    aria-label={`Remove ${title}`}
                    title="Remove"
                    disabled={!canRemove}
                    onClick={() => onChange(removeItem(field, items, index), 'discrete')}
                  >
                    <Icon name="trash" />
                  </button>
                </div>
              </li>
            );
          })}
        </ol>
      )}
      <button type="button" className="ve-button ve-list-add" disabled={!canAdd} onClick={add}>
        <Icon name="plus" />
        Add item
      </button>
      {field.maxItems !== undefined && (
        <p className="ve-control-help">
          {items.length} of {field.maxItems} items
        </p>
      )}
    </div>
  );
}
