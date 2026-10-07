import { describe, expect, it, vi } from 'vitest';
import { click, render, runInAct } from '../../../src/test/dom';
import { Button } from './Button';
import { IconButton } from './IconButton';

describe('Button', () => {
  it('is a plain button in the secondary style unless told otherwise', () => {
    const { container } = render(<Button>Cancel</Button>);
    const button = container.querySelector('button');
    expect(button?.type).toBe('button');
    expect(button?.className).toBe('ui-button ui-button--secondary');
    expect(button?.textContent).toBe('Cancel');
  });

  it('uses the chosen variant, keeps extra classes and shows an icon before the text', () => {
    const { container } = render(
      <Button variant="primary" icon="plus" className="ve-add">
        Add page
      </Button>,
    );
    const button = container.querySelector('button');
    expect(button?.className).toBe('ui-button ui-button--primary ve-add');
    expect(button?.firstElementChild?.tagName.toLowerCase()).toBe('svg');
  });

  it('can submit a form and passes clicks through', () => {
    const onClick = vi.fn();
    const { container } = render(
      <Button type="submit" onClick={onClick}>
        Save
      </Button>,
    );
    const button = container.querySelector('button');
    expect(button?.type).toBe('submit');
    click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('does not react when disabled', () => {
    const onClick = vi.fn();
    const { container } = render(
      <Button disabled onClick={onClick}>
        Save
      </Button>,
    );
    click(container.querySelector('button'));
    expect(onClick).not.toHaveBeenCalled();
  });
});

describe('IconButton', () => {
  it('names the button with its label for screen readers and shows it as a tooltip on focus', () => {
    const { container } = render(
      <IconButton label="Delete block" icon="trash" shortcut="Delete" />,
    );
    const button = container.querySelector('button');
    if (button === null) throw new Error('No button');
    expect(button.getAttribute('aria-label')).toBe('Delete block');
    expect(button.hasAttribute('title')).toBe(false);
    expect(button.getAttribute('aria-keyshortcuts')).toBe('Delete');
    runInAct(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
      button.focus();
    });
    const tooltip = container.querySelector('[role="tooltip"]');
    expect(tooltip?.textContent).toBe('Delete blockDelete');
    expect(tooltip?.getAttribute('aria-hidden')).toBe('true');
    runInAct(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });
    expect(container.querySelector('[role="tooltip"]')).toBeNull();
  });

  it('reports a pressed state only when one is given', () => {
    const { container, rerender } = render(<IconButton label="Phone" icon="smartphone" />);
    expect(container.querySelector('button')?.hasAttribute('aria-pressed')).toBe(false);
    rerender(<IconButton label="Phone" icon="smartphone" isPressed />);
    expect(container.querySelector('button')?.getAttribute('aria-pressed')).toBe('true');
  });
});
