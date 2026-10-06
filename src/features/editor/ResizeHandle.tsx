import type { JSX, KeyboardEvent, PointerEvent as ReactPointerEvent } from 'react';
import { PANEL_LIMITS, panelResized, type PanelSide } from '../../app/editorSlice';
import { dispatch, useStore } from '../../app/store';

const KEYBOARD_STEP = 16;
const PRIMARY_BUTTON = 0;

export function ResizeHandle({ side }: { side: PanelSide }): JSX.Element {
  const width = useStore((state) => state.editor.panels[side].width);
  const { min, max } = PANEL_LIMITS[side];
  const direction = side === 'left' ? 1 : -1;

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== PRIMARY_BUTTON) return;
    const handle = event.currentTarget;
    const startX = event.clientX;
    const startWidth = width;
    handle.setPointerCapture(event.pointerId);
    function onMove(move: PointerEvent): void {
      dispatch(panelResized({ side, width: startWidth + (move.clientX - startX) * direction }));
    }
    function onEnd(): void {
      handle.removeEventListener('pointermove', onMove);
      handle.removeEventListener('pointerup', onEnd);
      handle.removeEventListener('pointercancel', onEnd);
    }
    handle.addEventListener('pointermove', onMove);
    handle.addEventListener('pointerup', onEnd);
    handle.addEventListener('pointercancel', onEnd);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    let step: number;
    if (event.key === 'ArrowRight') {
      step = KEYBOARD_STEP;
    } else if (event.key === 'ArrowLeft') {
      step = -KEYBOARD_STEP;
    } else {
      return;
    }
    event.preventDefault();
    dispatch(panelResized({ side, width: width + step * direction }));
  };

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={side === 'left' ? 'Resize library panel' : 'Resize properties panel'}
      aria-valuenow={width}
      aria-valuemin={min}
      aria-valuemax={max}
      tabIndex={0}
      className="ve-resize-handle"
      data-side={side}
      onPointerDown={handlePointerDown}
      onKeyDown={handleKeyDown}
    />
  );
}
