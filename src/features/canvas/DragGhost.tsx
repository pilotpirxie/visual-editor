import { useSyncExternalStore, type JSX } from 'react';
import { dragController } from './dragController';

const GHOST_OFFSET_PX = 14;

export function DragGhost(): JSX.Element | null {
  const drag = useSyncExternalStore(dragController.subscribe, dragController.getSnapshot);
  if (drag === null) return null;
  const x = drag.point.x + GHOST_OFFSET_PX;
  const y = drag.point.y + GHOST_OFFSET_PX;
  return (
    <div className="ve-drag-ghost" style={{ transform: `translate(${x}px, ${y}px)` }}>
      {drag.payload.label}
    </div>
  );
}
