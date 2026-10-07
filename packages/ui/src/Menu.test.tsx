import { describe, expect, it, vi } from 'vitest';
import { pressKey, render } from '../../../src/test/dom';
import { MenuButton, PointMenu, shortcutLabel, type MenuItem } from './Menu';

function items(onSelect = vi.fn()): MenuItem[] {
  return [
    { id: 'one', label: 'One', shortcut: 'Mod+D', onSelect },
    { id: 'gap', isSeparator: true },
    { id: 'two', label: 'Two', disabled: true, onSelect },
    { id: 'three', label: 'Three', isChecked: true, onSelect },
  ];
}

function menuItems(container: ParentNode): HTMLButtonElement[] {
  return [...container.querySelectorAll<HTMLButtonElement>('[role^="menuitem"]')];
}

describe('shortcutLabel', () => {
  it('writes shortcuts the way the platform shows them', () => {
    const label = shortcutLabel('Shift+Mod+Z');
    expect(['⇧⌘Z', 'Shift+Ctrl+Z']).toContain(label);
  });
});

describe('MenuButton', () => {
  it('renders a menu button with menu items, a separator and a checked item', () => {
    const { container } = render(<MenuButton label="Edit" items={items()} />);
    const button = container.querySelector('button[aria-haspopup="menu"]');
    const menu = container.querySelector('[role="menu"]');
    expect(button?.getAttribute('popovertarget')).toBe(menu?.id);
    expect(menuItems(container)).toHaveLength(3);
    expect(container.querySelector('.ui-menu-separator')).not.toBeNull();
    expect(container.querySelector('[role="menuitemcheckbox"]')?.getAttribute('aria-checked')).toBe(
      'true',
    );
  });

  it('runs the action of a chosen item', () => {
    const onSelect = vi.fn();
    const { container } = render(<MenuButton label="Edit" items={items(onSelect)} />);
    menuItems(container)[0]?.click();
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it('moves focus between enabled items with the arrow keys', () => {
    const { container } = render(<MenuButton label="Edit" items={items()} />);
    const [one, , three] = menuItems(container);
    const menu = container.querySelector('[role="menu"]');
    if (menu === null) throw new Error('Expected a menu');
    one?.focus();
    pressKey(menu, 'ArrowDown');
    expect(document.activeElement).toBe(three);
    pressKey(menu, 'ArrowDown');
    expect(document.activeElement).toBe(one);
    pressKey(menu, 'End');
    expect(document.activeElement).toBe(three);
  });
});

describe('PointMenu', () => {
  it('opens at the given point', () => {
    const { container } = render(
      <PointMenu label="Block" items={items()} point={{ x: 40, y: 60 }} onClose={() => {}} />,
    );
    const menu = container.querySelector<HTMLElement>('[role="menu"]');
    expect(menu?.style.left).toBe('40px');
    expect(menu?.style.top).toBe('60px');
  });
});
