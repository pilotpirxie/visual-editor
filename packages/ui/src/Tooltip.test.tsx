import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { JSX } from 'react';
import { render, runInAct } from '../../../src/test/dom';
import { useTooltip } from './Tooltip';

function Described(): JSX.Element {
  const { triggerProps, tooltip } = useTooltip({ text: 'Saves a copy', isDescription: true });
  return (
    <>
      <button type="button" {...triggerProps}>
        Save
      </button>
      {tooltip}
    </>
  );
}

function hover(element: Element, pointerType = 'mouse'): void {
  const event = new MouseEvent('pointerover', { bubbles: true, relatedTarget: null });
  Object.defineProperty(event, 'pointerType', { value: pointerType });
  element.dispatchEvent(event);
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('useTooltip', () => {
  it('opens after a short hover and links a describing tooltip to its trigger', () => {
    const { container } = render(<Described />);
    const button = container.querySelector('button');
    if (button === null) throw new Error('No button');
    runInAct(() => hover(button));
    expect(container.querySelector('[role="tooltip"]')).toBeNull();
    runInAct(() => {
      vi.advanceTimersByTime(500);
    });
    const tooltip = container.querySelector('[role="tooltip"]');
    expect(tooltip?.textContent).toBe('Saves a copy');
    expect(button.getAttribute('aria-describedby')).toBe(tooltip?.id);
  });

  it('never opens from a touch', () => {
    const { container } = render(<Described />);
    const button = container.querySelector('button');
    if (button === null) throw new Error('No button');
    runInAct(() => hover(button, 'touch'));
    runInAct(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(container.querySelector('[role="tooltip"]')).toBeNull();
  });

  it('closes when focus leaves', () => {
    const { container } = render(<Described />);
    const button = container.querySelector('button');
    if (button === null) throw new Error('No button');
    runInAct(() => button.focus());
    expect(container.querySelector('[role="tooltip"]')).not.toBeNull();
    runInAct(() => button.blur());
    expect(container.querySelector('[role="tooltip"]')).toBeNull();
    expect(button.hasAttribute('aria-describedby')).toBe(false);
  });
});
