export type DragPayload =
  | { kind: 'new'; componentId: string; label: string }
  | { kind: 'move'; blockId: string; label: string };

export type Point = { x: number; y: number };

export type DropTarget = {
  accepts(payload: DragPayload): boolean;
  resolve(point: Point, payload: DragPayload): number | null;
  showIndicator(index: number | null, payload: DragPayload): void;
  drop(payload: DragPayload, index: number): void;
  tick?(point: Point): void;
};

export type DragSnapshot = { payload: DragPayload; point: Point } | null;

type PointerStart = {
  clientX: number;
  clientY: number;
  button: number;
  pointerId: number;
  currentTarget: EventTarget | null;
};

const DRAG_THRESHOLD_PX = 4;
const PRIMARY_BUTTON = 0;
const PRIMARY_BUTTON_MASK = 1;

function suppressClickUntilRelease(): void {
  function swallow(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
  }
  function stop(): void {
    window.removeEventListener('click', swallow, true);
    window.removeEventListener('pointerdown', stop, true);
  }
  window.addEventListener('click', swallow, true);
  window.addEventListener('pointerup', () => setTimeout(stop), { capture: true, once: true });
  window.addEventListener('pointerdown', stop, true);
}

type DragController = {
  start(payload: DragPayload, down: PointerStart): void;
  cancel(): void;
  isActive(): boolean;
  registerTarget(target: DropTarget): () => void;
  subscribe(listener: () => void): () => void;
  getSnapshot(): DragSnapshot;
};

function createDragController(): DragController {
  const targets = new Set<DropTarget>();
  const listeners = new Set<() => void>();
  let snapshot: DragSnapshot = null;
  let cancelSession: (() => void) | null = null;

  function notify(): void {
    for (const listener of listeners) listener();
  }

  function start(payload: DragPayload, down: PointerStart): void {
    if (down.button !== PRIMARY_BUTTON || cancelSession) return;
    const source = down.currentTarget instanceof Element ? down.currentTarget : null;

    const origin = { x: down.clientX, y: down.clientY };
    let point = origin;
    let isActive = false;
    let hovered: { target: DropTarget; index: number } | null = null;
    let frame = 0;

    function findDrop(): { target: DropTarget; index: number } | null {
      for (const target of targets) {
        if (!target.accepts(payload)) continue;
        const index = target.resolve(point, payload);
        if (index !== null) return { target, index };
      }
      return null;
    }

    function updateDrop(): void {
      hovered = findDrop();
      for (const target of targets) {
        if (target !== hovered?.target) target.showIndicator(null, payload);
      }
      if (hovered !== null) hovered.target.showIndicator(hovered.index, payload);
    }

    function loop(): void {
      if (hovered !== null) hovered.target.tick?.(point);
      updateDrop();
      frame = requestAnimationFrame(loop);
    }

    function activate(): void {
      isActive = true;
      if (source?.isConnected) source.setPointerCapture(down.pointerId);
      document.documentElement.classList.add('is-dragging');
      suppressClickUntilRelease();
      frame = requestAnimationFrame(loop);
    }

    function finish(): void {
      cancelAnimationFrame(frame);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', finish);
      window.removeEventListener('keydown', onKeyDown, true);
      document.documentElement.classList.remove('is-dragging');
      for (const target of targets) target.showIndicator(null, payload);
      cancelSession = null;
      snapshot = null;
      notify();
    }

    function onMove(event: PointerEvent): void {
      if ((event.buttons & PRIMARY_BUTTON_MASK) === 0) {
        finish();
        return;
      }
      point = { x: event.clientX, y: event.clientY };
      if (!isActive) {
        const distance = Math.hypot(point.x - origin.x, point.y - origin.y);
        if (distance < DRAG_THRESHOLD_PX) return;
        activate();
      }
      snapshot = { payload, point };
      notify();
      updateDrop();
    }

    function onUp(): void {
      const drop = isActive ? hovered : null;
      finish();
      if (drop !== null) drop.target.drop(payload, drop.index);
    }

    function onKeyDown(event: KeyboardEvent): void {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopPropagation();
      finish();
    }

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', finish);
    window.addEventListener('keydown', onKeyDown, true);
    cancelSession = finish;
  }

  function cancel(): void {
    if (cancelSession) cancelSession();
  }

  function isActive(): boolean {
    return snapshot !== null;
  }

  function registerTarget(target: DropTarget): () => void {
    targets.add(target);
    return () => targets.delete(target);
  }

  function subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  function getSnapshot(): DragSnapshot {
    return snapshot;
  }

  return { start, cancel, isActive, registerTarget, subscribe, getSnapshot };
}

export const dragController = createDragController();
