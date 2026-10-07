type Dropdown = { item: HTMLElement; trigger: HTMLButtonElement; menu: HTMLElement };

const HOVER_QUERY = '(min-width: 1024px) and (hover: hover)';
const OPEN_DELAY_MS = 120;
const CLOSE_DELAY_MS = 250;
const HOVER_CLICK_GRACE_MS = 600;

function dropdownsIn(root: HTMLElement): Dropdown[] {
  const dropdowns: Dropdown[] = [];
  for (const trigger of root.querySelectorAll<HTMLButtonElement>('button[popovertarget]')) {
    const menu = root.ownerDocument.getElementById(trigger.getAttribute('popovertarget') ?? '');
    const item = trigger.parentElement;
    if (menu === null || item === null || !menu.hasAttribute('data-dropdown-menu')) continue;
    dropdowns.push({ item, trigger, menu });
  }
  return dropdowns;
}

function linksOf(menu: HTMLElement): HTMLElement[] {
  return [...menu.querySelectorAll<HTMLElement>('a[href]')];
}

function isOpen(menu: HTMLElement): boolean {
  return menu.matches(':popover-open');
}

function supportsAnchors(): boolean {
  return (
    typeof CSS !== 'undefined' &&
    typeof CSS.supports === 'function' &&
    CSS.supports('anchor-name: --a')
  );
}

function placeBelow(trigger: HTMLElement, menu: HTMLElement, view: Window): void {
  const box = trigger.getBoundingClientRect();
  menu.style.position = 'absolute';
  menu.style.top = `${box.bottom + view.scrollY}px`;
  if (view.getComputedStyle(trigger).direction === 'rtl') {
    menu.style.left = 'auto';
    menu.style.right = `${view.document.documentElement.clientWidth - box.right - view.scrollX}px`;
    return;
  }
  menu.style.right = 'auto';
  menu.style.left = `${box.left + view.scrollX}px`;
}

function nextLinkIndex(key: string, current: number, count: number): number | null {
  if (key === 'ArrowDown') {
    return (current + 1) % count;
  } else if (key === 'ArrowUp') {
    return (current - 1 + count) % count;
  } else if (key === 'Home') {
    return 0;
  } else if (key === 'End') {
    return count - 1;
  } else {
    return null;
  }
}

function connectDropdown({ item, trigger, menu }: Dropdown, view: Window): () => void {
  const hover = view.matchMedia(HOVER_QUERY);
  let timer = 0;
  let hoverOpenedAt = 0;

  function open(): void {
    if (!isOpen(menu)) menu.showPopover();
  }

  function close(): void {
    if (isOpen(menu)) menu.hidePopover();
  }

  function focusLink(index: number): void {
    const links = linksOf(menu);
    links[(index + links.length) % links.length]?.focus();
  }

  function syncOpenState(): void {
    const isMenuOpen = isOpen(menu);
    if (isMenuOpen) view.clearTimeout(timer);
    trigger.setAttribute('aria-expanded', String(isMenuOpen));
    if (isMenuOpen && !supportsAnchors()) placeBelow(trigger, menu, view);
  }

  function openWithKeys(event: KeyboardEvent): void {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    event.preventDefault();
    open();
    focusLink(event.key === 'ArrowDown' ? 0 : -1);
  }

  function moveWithKeys(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      view.clearTimeout(timer);
      close();
      trigger.focus();
      return;
    }
    const links = linksOf(menu);
    const current = links.findIndex((link) => link === event.target);
    const next = nextLinkIndex(event.key, current, links.length);
    if (next === null || links.length === 0) return;
    event.preventDefault();
    focusLink(next);
  }

  function closeOnLinkClick(event: Event): void {
    if (event.target instanceof Element && event.target.closest('a') !== null) close();
  }

  function closeWhenFocusLeaves(event: FocusEvent): void {
    const target = event.relatedTarget;
    if (target instanceof Node && (menu.contains(target) || trigger.contains(target))) return;
    close();
  }

  function keepHoverOpenOnClick(event: MouseEvent): void {
    const isRightAfterHover = view.performance.now() - hoverOpenedAt < HOVER_CLICK_GRACE_MS;
    if (isOpen(menu) && isRightAfterHover) event.preventDefault();
  }

  function openOnHover(): void {
    if (!hover.matches) return;
    view.clearTimeout(timer);
    timer = view.setTimeout(() => {
      if (isOpen(menu)) return;
      open();
      hoverOpenedAt = view.performance.now();
    }, OPEN_DELAY_MS);
  }

  function closeOnHoverEnd(): void {
    if (!hover.matches) return;
    view.clearTimeout(timer);
    timer = view.setTimeout(close, CLOSE_DELAY_MS);
  }

  menu.addEventListener('toggle', syncOpenState);
  menu.addEventListener('keydown', moveWithKeys);
  menu.addEventListener('focusout', closeWhenFocusLeaves);
  menu.addEventListener('click', closeOnLinkClick);
  trigger.addEventListener('keydown', openWithKeys);
  trigger.addEventListener('click', keepHoverOpenOnClick);
  item.addEventListener('pointerenter', openOnHover);
  item.addEventListener('pointerleave', closeOnHoverEnd);
  syncOpenState();

  return () => {
    view.clearTimeout(timer);
    menu.removeEventListener('toggle', syncOpenState);
    menu.removeEventListener('keydown', moveWithKeys);
    menu.removeEventListener('focusout', closeWhenFocusLeaves);
    menu.removeEventListener('click', closeOnLinkClick);
    trigger.removeEventListener('keydown', openWithKeys);
    trigger.removeEventListener('click', keepHoverOpenOnClick);
    item.removeEventListener('pointerenter', openOnHover);
    item.removeEventListener('pointerleave', closeOnHoverEnd);
    close();
    menu.style.removeProperty('position');
    menu.style.removeProperty('top');
    menu.style.removeProperty('left');
    trigger.setAttribute('aria-expanded', 'false');
  };
}

siteRuntime.register({
  name: 'dropdown',
  init(root) {
    const view = root.ownerDocument.defaultView;
    const dropdowns = dropdownsIn(root);
    const canPop = dropdowns.every(({ menu }) => typeof menu.showPopover === 'function');
    if (view === null || dropdowns.length === 0 || !canPop) {
      console.warn(
        'siteRuntime dropdown: needs [popovertarget] buttons for [data-dropdown-menu] popovers',
        root,
      );
      return () => {};
    }
    const disposers: Array<() => void> = [];
    for (const dropdown of dropdowns) disposers.push(connectDropdown(dropdown, view));
    return () => {
      for (const dispose of disposers) dispose();
    };
  },
});
