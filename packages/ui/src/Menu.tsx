import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  type JSX,
  type KeyboardEvent,
  type RefObject,
} from 'react';
import { buttonClassName, type ButtonVariant } from './Button';
import { classNames } from './classNames';
import { Icon } from './Icon';
import './Menu.css';

export type MenuAction = {
  id: string;
  label: string;
  shortcut?: string;
  hint?: string;
  disabled?: boolean;
  isDanger?: boolean;
  isChecked?: boolean;
  onSelect(): void;
};

export type MenuSeparator = { id: string; isSeparator: true };

export type MenuItem = MenuAction | MenuSeparator;

export type MenuPoint = { x: number; y: number };

const IS_MAC = /Mac|iPhone|iPad/.test(globalThis.navigator?.platform ?? '');
const VIEWPORT_MARGIN = 8;

const MAC_KEYS: Record<string, string> = { Mod: '⌘', Shift: '⇧', Alt: '⌥' };
const OTHER_KEYS: Record<string, string> = { Mod: 'Ctrl', Shift: 'Shift', Alt: 'Alt' };

export function shortcutLabel(keys: string): string {
  const names = IS_MAC ? MAC_KEYS : OTHER_KEYS;
  const parts: string[] = [];
  for (const part of keys.split('+')) parts.push(names[part] ?? part);
  return parts.join(IS_MAC ? '' : '+');
}

function isSeparator(item: MenuItem): item is MenuSeparator {
  return 'isSeparator' in item;
}

function isPopoverOpen(element: Element): boolean {
  try {
    return element.matches(':popover-open');
  } catch (error) {
    console.warn('This browser does not support popovers', error);
    return false;
  }
}

export function afterPointerRelease(event: { buttons: number }, callback: () => void): void {
  if (event.buttons === 0) {
    callback();
    return;
  }
  window.addEventListener('pointerup', () => setTimeout(callback), { once: true, capture: true });
}

export function closeOwningPopover(element: Element): void {
  const popover = element.closest<HTMLElement>('[popover]');
  if (popover !== null && isPopoverOpen(popover)) popover.hidePopover();
}

export function closeOpenPopovers(doc: Document): void {
  for (const popover of doc.querySelectorAll<HTMLElement>('[popover]')) {
    if (isPopoverOpen(popover)) popover.hidePopover();
  }
}

function menuButtons(menu: HTMLElement): HTMLButtonElement[] {
  return [...menu.querySelectorAll<HTMLButtonElement>('[role^="menuitem"]:enabled')];
}

function focusFirstItem(menu: HTMLElement): void {
  menuButtons(menu)[0]?.focus();
}

function moveFocus(event: KeyboardEvent<HTMLDivElement>): void {
  const buttons = menuButtons(event.currentTarget);
  if (buttons.length === 0) return;
  const current = buttons.findIndex((button) => button === document.activeElement);
  let next: number;
  if (event.key === 'ArrowDown') {
    next = (current + 1) % buttons.length;
  } else if (event.key === 'ArrowUp') {
    next = current <= 0 ? buttons.length - 1 : current - 1;
  } else if (event.key === 'Home') {
    next = 0;
  } else if (event.key === 'End') {
    next = buttons.length - 1;
  } else {
    return;
  }
  event.preventDefault();
  buttons[next]?.focus();
}

function useToggle(menuRef: RefObject<HTMLDivElement | null>, onClosed?: () => void): void {
  useEffect(() => {
    const menu = menuRef.current;
    if (menu === null) return;
    function handleToggle(event: Event): void {
      const isOpening = 'newState' in event && event.newState === 'open';
      if (isOpening && menu !== null) {
        focusFirstItem(menu);
      } else if (!isOpening) {
        onClosed?.();
      }
    }
    menu.addEventListener('toggle', handleToggle);
    return () => menu.removeEventListener('toggle', handleToggle);
  }, [menuRef, onClosed]);
}

type MenuListProps = {
  id: string;
  label: string;
  items: MenuItem[];
  menuRef: RefObject<HTMLDivElement | null>;
  className?: string;
};

function MenuList({ id, label, items, menuRef, className }: MenuListProps): JSX.Element {
  return (
    <div
      ref={menuRef}
      id={id}
      className={classNames('ui-menu', className)}
      popover="auto"
      role="menu"
      aria-label={label}
      onKeyDown={moveFocus}
    >
      {items.map((item) => {
        if (isSeparator(item)) return <div key={item.id} className="ui-menu-separator" />;
        const isCheckable = item.isChecked !== undefined;
        return (
          <button
            key={item.id}
            type="button"
            role={isCheckable ? 'menuitemcheckbox' : 'menuitem'}
            aria-label={item.label}
            aria-checked={isCheckable ? item.isChecked : undefined}
            className={item.isDanger === true ? 'ui-menu-danger' : undefined}
            disabled={item.disabled}
            title={item.hint}
            onClick={(event) => {
              closeOwningPopover(event.currentTarget);
              item.onSelect();
            }}
          >
            <span className="ui-menu-check" aria-hidden="true">
              {item.isChecked === true ? '✓' : ''}
            </span>
            <span className="ui-menu-label">{item.label}</span>
            {item.shortcut !== undefined && (
              <kbd className="ui-menu-shortcut">{shortcutLabel(item.shortcut)}</kbd>
            )}
          </button>
        );
      })}
    </div>
  );
}

type MenuButtonProps = {
  label: string;
  items: MenuItem[];
  icon?: string;
  variant?: ButtonVariant;
  className?: string;
  isLabelShown?: boolean;
  status?: string;
};

export function MenuButton({
  label,
  items,
  icon,
  variant = 'ghost',
  className,
  isLabelShown = true,
  status,
}: MenuButtonProps): JSX.Element {
  const menuId = useId();
  const menuRef = useRef<HTMLDivElement>(null);
  useToggle(menuRef);
  const buttonClass = isLabelShown
    ? buttonClassName(variant, className)
    : classNames('ui-icon-button', className);
  return (
    <>
      <button
        type="button"
        className={buttonClass}
        popoverTarget={menuId}
        aria-haspopup="menu"
        aria-label={status === undefined ? label : `${label}, ${status}`}
        title={status === undefined ? label : `${label} (${status})`}
      >
        {icon !== undefined && <Icon name={icon} />}
        {isLabelShown && <span className="ve-wide-only">{label}</span>}
        {status !== undefined && <span className="ui-menu-dot" aria-hidden="true" />}
      </button>
      <MenuList id={menuId} label={label} items={items} menuRef={menuRef} />
    </>
  );
}

type PointMenuProps = { label: string; items: MenuItem[]; point: MenuPoint; onClose(): void };

export function PointMenu({ label, items, point, onClose }: PointMenuProps): JSX.Element {
  const menuId = useId();
  const menuRef = useRef<HTMLDivElement>(null);
  useToggle(menuRef, onClose);

  useLayoutEffect(() => {
    const menu = menuRef.current;
    if (menu === null) return;
    menu.style.left = `${point.x}px`;
    menu.style.top = `${point.y}px`;
    if (!isPopoverOpen(menu)) menu.showPopover();
    const box = menu.getBoundingClientRect();
    const maxLeft = window.innerWidth - box.width - VIEWPORT_MARGIN;
    const maxTop = window.innerHeight - box.height - VIEWPORT_MARGIN;
    menu.style.left = `${Math.max(VIEWPORT_MARGIN, Math.min(point.x, maxLeft))}px`;
    menu.style.top = `${Math.max(VIEWPORT_MARGIN, Math.min(point.y, maxTop))}px`;
  }, [point]);

  return (
    <MenuList
      id={menuId}
      label={label}
      items={items}
      menuRef={menuRef}
      className="ui-menu--at-point"
    />
  );
}
