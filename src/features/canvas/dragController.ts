import type { Point } from './geometry';

export type DragPayload =
  | { kind: 'new'; componentId: string; label: string }
  | { kind: 'move'; blockId: string; label: string }
  | { kind: 'list-item'; ownerKey: string; index: number; label: string };

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

export type DragSourceFrame = { view: Window; toPage(point: Point): Point };

type HoveredDrop = { target: DropTarget; index: number };

const DRAG_THRESHOLD_PX = 4;
const PRIMARY_BUTTON = 0;
const PRIMARY_BUTTON_MASK = 1;

function suppressClickUntilRelease(views: Window[]): void {
  function swallow(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
  }
  function stop(): void {
    for (const view of views) {
      view.removeEventListener('click', swallow, true);
      view.removeEventListener('pointerup', stopAfterClick, true);
      view.removeEventListener('pointerdown', stop, true);
    }
  }
  function stopAfterClick(): void {
    setTimeout(stop);
  }
  for (const view of views) {
    view.addEventListener('click', swallow, true);
    view.addEventListener('pointerup', stopAfterClick, true);
    view.addEventListener('pointerdown', stop, true);
  }
}

function canCapturePointer(target: EventTarget | null): target is Element {
  return target !== null && 'setPointerCapture' in target;
}

export type DragController = {
  start(payload: DragPayload, down: PointerStart, frame?: DragSourceFrame): void;
  cancel(): void;
  isActive(): boolean;
  registerTarget(target: DropTarget): () => void;
  subscribe(listener: () => void): () => void;
  getSnapshot(): DragSnapshot;
};

export function createDragController(): DragController {
  const targets = new Set<DropTarget>();
  const listeners = new Set<() => void>();
  let snapshot: DragSnapshot = null;
  let cancelSession: (() => void) | null = null;

  function notify(): void {
    for (const listener of listeners) listener();
  }

  function start(payload: DragPayload, down: PointerStart, frame?: DragSourceFrame): void {
    if (down.button !== PRIMARY_BUTTON || cancelSession !== null) return;
    const source = canCapturePointer(down.currentTarget) ? down.currentTarget : null;
    const parent: DragSourceFrame = { view: window, toPage: (point) => point };
    const sources = frame === undefined ? [parent] : [parent, frame];
    const views = sources.map((each) => each.view);
    const moveListeners = sources.map((each) => ({
      view: each.view,
      listener: (event: PointerEvent) => onMove(event, each.toPage),
    }));

    const origin = (frame ?? parent).toPage({ x: down.clientX, y: down.clientY });
    let point = origin;
    let isActive = false;
    let hovered: HoveredDrop | null = null;
    let animationFrame = 0;

    function findDrop(): HoveredDrop | null {
      for (const target of targets) {
        if (!target.accepts(payload)) continue;
        const index = target.resolve(point, payload);
        if (index !== null) return { target, index };
      }
      return null;
    }

    function updateDrop(): void {
      const drop = findDrop();
      hovered = drop;
      for (const target of targets) {
        const isHovered = drop !== null && drop.target === target;
        if (!isHovered) target.showIndicator(null, payload);
      }
      if (drop !== null) drop.target.showIndicator(drop.index, payload);
    }

    function loop(): void {
      if (hovered !== null) hovered.target.tick?.(point);
      updateDrop();
      animationFrame = requestAnimationFrame(loop);
    }

    function setDragging(isDragging: boolean): void {
      for (const view of views) {
        view.document.documentElement.classList.toggle('is-dragging', isDragging);
      }
    }

    function activate(): void {
      isActive = true;
      if (source !== null && source.isConnected) source.setPointerCapture(down.pointerId);
      setDragging(true);
      suppressClickUntilRelease(views);
      animationFrame = requestAnimationFrame(loop);
    }

    function finish(): void {
      cancelAnimationFrame(animationFrame);
      for (const { view, listener } of moveListeners) {
        view.removeEventListener('pointermove', listener);
        view.removeEventListener('pointerup', onUp);
        view.removeEventListener('pointercancel', finish);
        view.removeEventListener('keydown', onKeyDown, true);
      }
      setDragging(false);
      for (const target of targets) target.showIndicator(null, payload);
      cancelSession = null;
      snapshot = null;
      notify();
    }

    function onMove(event: PointerEvent, toPage: (point: Point) => Point): void {
      const isPrimaryPressed = (event.buttons & PRIMARY_BUTTON_MASK) !== 0;
      if (!isPrimaryPressed) {
        finish();
        return;
      }
      point = toPage({ x: event.clientX, y: event.clientY });
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

    for (const { view, listener } of moveListeners) {
      view.addEventListener('pointermove', listener);
      view.addEventListener('pointerup', onUp);
      view.addEventListener('pointercancel', finish);
      view.addEventListener('keydown', onKeyDown, true);
    }
    cancelSession = finish;
  }

  function cancel(): void {
    if (cancelSession !== null) cancelSession();
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
