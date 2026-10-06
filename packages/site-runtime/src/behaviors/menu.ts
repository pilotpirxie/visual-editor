const DESKTOP_QUERY = '(min-width: 1024px)';

siteRuntime.register({
  name: 'menu',
  init(root) {
    const menu = root.querySelector<HTMLElement>('[popover]');
    const toggle = menu && root.querySelector(`[popovertarget="${CSS.escape(menu.id)}"]`);
    if (!menu || !toggle) {
      console.warn('siteRuntime menu: needs a [popover] list and a [popovertarget] button', root);
      return () => {};
    }

    const desktop = (root.ownerDocument.defaultView ?? window).matchMedia(DESKTOP_QUERY);

    const isOpen = (): boolean => menu.matches(':popover-open');
    const close = (): void => {
      if (isOpen()) menu.hidePopover();
    };
    const syncExpanded = (): void => toggle.setAttribute('aria-expanded', String(isOpen()));
    const closeOnLinkClick = (event: Event): void => {
      if (event.target instanceof Element && event.target.closest('a')) close();
    };
    const closeOnDesktop = (): void => {
      if (desktop.matches) close();
    };

    menu.addEventListener('toggle', syncExpanded);
    menu.addEventListener('click', closeOnLinkClick);
    desktop.addEventListener('change', closeOnDesktop);
    syncExpanded();

    return () => {
      menu.removeEventListener('toggle', syncExpanded);
      menu.removeEventListener('click', closeOnLinkClick);
      desktop.removeEventListener('change', closeOnDesktop);
    };
  },
});
