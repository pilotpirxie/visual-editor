import { afterEach, describe, expect, it } from 'vitest';
import {
  createDragController,
  type DragController,
  type DragPayload,
  type DropTarget,
} from './dragController';

const NEW_BLOCK: DragPayload = { kind: 'new', componentId: 'cta-centered', label: 'CTA' };
const PRIMARY_BUTTON = 0;
const SECONDARY_BUTTON = 2;

type TargetCapture = {
  target: DropTarget;
  drops: { payload: DragPayload; index: number }[];
  indicators: (number | null)[];
};

function createTarget(index: number | null, isAccepting = true): TargetCapture {
  const drops: TargetCapture['drops'] = [];
  const indicators: TargetCapture['indicators'] = [];
  const target: DropTarget = {
    accepts: () => isAccepting,
    resolve: () => index,
    showIndicator: (shown) => {
      indicators.push(shown);
    },
    drop: (payload, dropIndex) => {
      drops.push({ payload, index: dropIndex });
    },
  };
  return { target, drops, indicators };
}

function pointer(type: string, x: number, y: number, buttons = 1): void {
  window.dispatchEvent(new PointerEvent(type, { clientX: x, clientY: y, buttons, bubbles: true }));
}

function startAt(controller: DragController, x: number, y: number, button = PRIMARY_BUTTON): void {
  controller.start(NEW_BLOCK, {
    clientX: x,
    clientY: y,
    button,
    pointerId: 1,
    currentTarget: document.body,
  });
}

let controller = createDragController();

afterEach(() => {
  controller.cancel();
  controller = createDragController();
});

describe('start', () => {
  it('does not start dragging until the pointer moves past the threshold', () => {
    startAt(controller, 100, 100);
    pointer('pointermove', 102, 101);
    expect(controller.isActive()).toBe(false);
    expect(controller.getSnapshot()).toBeNull();
  });

  it('starts dragging after the threshold and reports the payload and pointer', () => {
    startAt(controller, 100, 100);
    pointer('pointermove', 110, 100);
    expect(controller.isActive()).toBe(true);
    expect(controller.getSnapshot()).toEqual({ payload: NEW_BLOCK, point: { x: 110, y: 100 } });
    expect(document.documentElement.classList.contains('is-dragging')).toBe(true);
  });

  it('ignores presses with any button other than the primary one', () => {
    startAt(controller, 100, 100, SECONDARY_BUTTON);
    pointer('pointermove', 200, 200);
    expect(controller.isActive()).toBe(false);
  });

  it('ignores a second press while a drag is already running', () => {
    const { target, drops } = createTarget(2);
    controller.registerTarget(target);
    startAt(controller, 100, 100);
    controller.start(
      { kind: 'move', blockId: 'other', label: 'Other' },
      { clientX: 0, clientY: 0, button: PRIMARY_BUTTON, pointerId: 2, currentTarget: null },
    );
    pointer('pointermove', 120, 100);
    pointer('pointerup', 120, 100, 0);
    expect(drops).toEqual([{ payload: NEW_BLOCK, index: 2 }]);
  });
});

describe('drop', () => {
  it('drops on the target under the pointer and ends the drag', () => {
    const { target, drops } = createTarget(3);
    controller.registerTarget(target);
    startAt(controller, 100, 100);
    pointer('pointermove', 120, 140);
    pointer('pointerup', 120, 140, 0);
    expect(drops).toEqual([{ payload: NEW_BLOCK, index: 3 }]);
    expect(controller.isActive()).toBe(false);
    expect(document.documentElement.classList.contains('is-dragging')).toBe(false);
  });

  it('does not drop after a plain click', () => {
    const { target, drops } = createTarget(3);
    controller.registerTarget(target);
    startAt(controller, 100, 100);
    pointer('pointerup', 100, 100, 0);
    expect(drops).toHaveLength(0);
  });

  it('skips targets that do not accept the payload', () => {
    const refusing = createTarget(1, false);
    const accepting = createTarget(4);
    controller.registerTarget(refusing.target);
    controller.registerTarget(accepting.target);
    startAt(controller, 100, 100);
    pointer('pointermove', 120, 100);
    pointer('pointerup', 120, 100, 0);
    expect(refusing.drops).toHaveLength(0);
    expect(accepting.drops).toEqual([{ payload: NEW_BLOCK, index: 4 }]);
  });

  it('shows the indicator only on the target under the pointer', () => {
    const outside = createTarget(null);
    const under = createTarget(1);
    controller.registerTarget(outside.target);
    controller.registerTarget(under.target);
    startAt(controller, 100, 100);
    pointer('pointermove', 120, 100);
    expect(under.indicators.at(-1)).toBe(1);
    expect(outside.indicators.at(-1)).toBeNull();
  });

  it('stops offering a target once it is unregistered', () => {
    const { target, drops } = createTarget(1);
    const unregister = controller.registerTarget(target);
    unregister();
    startAt(controller, 100, 100);
    pointer('pointermove', 120, 100);
    pointer('pointerup', 120, 100, 0);
    expect(drops).toHaveLength(0);
  });

  it('swallows the click that follows a drag so it does not select anything', () => {
    controller.registerTarget(createTarget(1).target);
    startAt(controller, 100, 100);
    pointer('pointermove', 120, 100);
    pointer('pointerup', 120, 100, 0);
    const click = new MouseEvent('click', { bubbles: true, cancelable: true });
    document.body.dispatchEvent(click);
    expect(click.defaultPrevented).toBe(true);
  });
});

describe('cancel', () => {
  it('ends the drag on Escape without dropping and clears every indicator', () => {
    const { target, drops, indicators } = createTarget(2);
    controller.registerTarget(target);
    startAt(controller, 100, 100);
    pointer('pointermove', 120, 100);
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', cancelable: true }));
    pointer('pointerup', 120, 100, 0);
    expect(drops).toHaveLength(0);
    expect(indicators.at(-1)).toBeNull();
    expect(controller.isActive()).toBe(false);
  });

  it('ends the drag when the button was released outside the window', () => {
    const { target, drops } = createTarget(2);
    controller.registerTarget(target);
    startAt(controller, 100, 100);
    pointer('pointermove', 120, 100);
    pointer('pointermove', 130, 100, 0);
    expect(controller.isActive()).toBe(false);
    pointer('pointerup', 130, 100, 0);
    expect(drops).toHaveLength(0);
  });

  it('can be called when nothing is being dragged', () => {
    expect(() => controller.cancel()).not.toThrow();
  });
});

describe('subscribe', () => {
  it('notifies listeners while dragging and when the drag ends, until unsubscribed', () => {
    let notifications = 0;
    const unsubscribe = controller.subscribe(() => {
      notifications += 1;
    });
    startAt(controller, 100, 100);
    pointer('pointermove', 120, 100);
    pointer('pointerup', 120, 100, 0);
    const afterDrag = notifications;
    unsubscribe();
    startAt(controller, 100, 100);
    pointer('pointermove', 120, 100);
    expect(afterDrag).toBe(2);
    expect(notifications).toBe(afterDrag);
  });
});
