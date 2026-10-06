import { useEffect, useEffectEvent, useRef, useState, type JSX, type KeyboardEvent } from 'react';
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
} from '../../components/fields';
import { dragController } from '../canvas/dragController';
import { dropIndexFromSpans, finalMoveIndex } from '../canvas/dropIndex';
import { Icon } from '../editor/Icon';
import { FieldControl, hasControl, type ControlProps } from './FieldControl';

const DROP_MARGIN = 8;

function focusItem(list: HTMLElement | null, index: number, selector: string): void {
  requestAnimationFrame(() => {
    const item = list?.children[index];
    if (item === undefined) return;
    const details = item.querySelector('details');
    if (selector !== '.ve-list-handle' && details !== null) details.open = true;
    item.querySelector<HTMLElement>(selector)?.focus();
  });
}

export function ListField({ field, value, id, path, onChange }: ControlProps): JSX.Element {
  const items = asListItems(value);
  const listRef = useRef<HTMLOListElement>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const labelId = `${id}-label`;
  const canAdd = canAddItem(field, items);
  const canRemove = canRemoveItem(field, items);
  const itemFields = (field.itemFields ?? []).filter(hasControl);

  const dropItem = useEffectEvent((from: number, dropAt: number) => {
    const to = finalMoveIndex(from, dropAt);
    if (to !== from) onChange(moveItem(items, from, to));
  });

  useEffect(
    () =>
      dragController.registerTarget({
        accepts: (payload) => payload.kind === 'list-item' && payload.ownerKey === path,
        resolve(point) {
          const list = listRef.current;
          if (list === null) return null;
          const box = list.getBoundingClientRect();
          const isOver =
            point.x >= box.left &&
            point.x <= box.right &&
            point.y >= box.top - DROP_MARGIN &&
            point.y <= box.bottom + DROP_MARGIN;
          if (!isOver) return null;
          const rows = [...list.children].map((row) => row.getBoundingClientRect());
          return dropIndexFromSpans(rows, point.y);
        },
        showIndicator(index, payload) {
          const isNoop =
            index === null ||
            payload.kind !== 'list-item' ||
            finalMoveIndex(payload.index, index) === payload.index;
          setDropIndex(isNoop ? null : index);
        },
        drop(payload, index) {
          if (payload.kind === 'list-item') dropItem(payload.index, index);
        },
      }),
    [path],
  );

  function moveWithKeyboard(event: KeyboardEvent<HTMLButtonElement>, index: number): void {
    if (!event.altKey || (event.key !== 'ArrowUp' && event.key !== 'ArrowDown')) return;
    event.preventDefault();
    const to = event.key === 'ArrowUp' ? index - 1 : index + 1;
    if (to < 0 || to >= items.length) return;
    onChange(moveItem(items, index, to));
    focusItem(listRef.current, to, '.ve-list-handle');
  }

  function add(): void {
    onChange(addItem(field, items));
    focusItem(listRef.current, items.length, 'input, textarea, select, [contenteditable="true"]');
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
            let dropEdge: 'before' | 'after' | undefined;
            if (dropIndex === index) dropEdge = 'before';
            else if (dropIndex === items.length && index === items.length - 1) dropEdge = 'after';
            return (
              <li
                key={index}
                className="ve-list-item"
                data-field-path={itemPath}
                data-drop={dropEdge}
              >
                <details>
                  <summary className="ve-list-item-summary">{title}</summary>
                  <div className="ve-list-item-fields">
                    {itemFields
                      .filter((itemField) => isFieldVisible(itemField, item))
                      .map((itemField) => (
                        <FieldControl
                          key={itemField.name}
                          field={itemField}
                          value={item[itemField.name]}
                          path={`${itemPath}.${itemField.name}`}
                          onChange={(next) =>
                            onChange(replaceItem(items, index, { ...item, [itemField.name]: next }))
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
                    onClick={() => onChange(duplicateItem(field, items, index))}
                  >
                    <Icon name="copy" />
                  </button>
                  <button
                    type="button"
                    className="ve-icon-button"
                    aria-label={`Remove ${title}`}
                    title="Remove"
                    disabled={!canRemove}
                    onClick={() => onChange(removeItem(field, items, index))}
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
