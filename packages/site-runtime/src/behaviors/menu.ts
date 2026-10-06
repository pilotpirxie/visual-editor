const DESKTOP_QUERY = '(min-width: 1024px)';

function connectMenu(menu: HTMLElement, toggle: Element, desktop: MediaQueryList): () => void {
  function isOpen(): boolean {
    return menu.matches(':popover-open');
  }
  function close(): void {
    if (isOpen()) menu.hidePopover();
  }
  function syncExpanded(): void {
    toggle.setAttribute('aria-expanded', String(isOpen()));
  }
  function closeOnLinkClick(event: Event): void {
    if (event.target instanceof Element && event.target.closest('a')) close();
  }
  function closeOnDesktop(): void {
    if (desktop.matches) close();
  }

  menu.addEventListener('toggle', syncExpanded);
  menu.addEventListener('click', closeOnLinkClick);
  desktop.addEventListener('change', closeOnDesktop);
  syncExpanded();

  return () => {
    menu.removeEventListener('toggle', syncExpanded);
    menu.removeEventListener('click', closeOnLinkClick);
    desktop.removeEventListener('change', closeOnDesktop);
  };
}

siteRuntime.register({
  name: 'menu',
  init(root) {
    const menu = root.querySelector<HTMLElement>('[popover]');
    const toggle =
      menu === null ? null : root.querySelector(`[popovertarget="${CSS.escape(menu.id)}"]`);
    if (menu === null || toggle === null) {
      console.warn('siteRuntime menu: needs a [popover] list and a [popovertarget] button', root);
      return () => {};
    }
    const desktop = (root.ownerDocument.defaultView ?? window).matchMedia(DESKTOP_QUERY);
    return connectMenu(menu, toggle, desktop);
  },
});
