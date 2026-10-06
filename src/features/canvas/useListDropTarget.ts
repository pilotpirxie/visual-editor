import { useEffect, useEffectEvent, useState, type RefObject } from 'react';
import { dragController, type DragPayload } from './dragController';
import { listDropIndex, type VerticalSpan } from './geometry';

type ListDropTargetOptions = {
  listRef: RefObject<HTMLElement | null>;
  edgeMargin: number;
  accepts(payload: DragPayload): boolean;
  isNoopDrop(payload: DragPayload, index: number): boolean;
  drop(payload: DragPayload, index: number): void;
};

function rowSpans(list: HTMLElement): VerticalSpan[] {
  const spans: VerticalSpan[] = [];
  for (const row of list.children) spans.push(row.getBoundingClientRect());
  return spans;
}

export function useListDropTarget({
  listRef,
  edgeMargin,
  accepts,
  isNoopDrop,
  drop,
}: ListDropTargetOptions): number | null {
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const acceptsPayload = useEffectEvent((payload: DragPayload) => accepts(payload));
  const isNoop = useEffectEvent((payload: DragPayload, index: number) =>
    isNoopDrop(payload, index),
  );
  const dropPayload = useEffectEvent((payload: DragPayload, index: number) => drop(payload, index));

  useEffect(
    () =>
      dragController.registerTarget({
        accepts: (payload) => acceptsPayload(payload),
        resolve(point) {
          const list = listRef.current;
          if (list === null) return null;
          return listDropIndex(list.getBoundingClientRect(), rowSpans(list), point, edgeMargin);
        },
        showIndicator(index, payload) {
          if (index === null || isNoop(payload, index)) {
            setDropIndex(null);
            return;
          }
          setDropIndex(index);
        },
        drop: (payload, index) => dropPayload(payload, index),
      }),
    [listRef, edgeMargin],
  );

  return dropIndex;
}
