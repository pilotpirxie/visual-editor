function decodeFragment(hash: string): string {
  const fragment = hash.startsWith('#') ? hash.slice(1) : hash;
  try {
    return decodeURIComponent(fragment);
  } catch (error) {
    console.warn(`siteRuntime modal: could not decode the link "#${fragment}"`, error);
    return fragment;
  }
}

function isInside(box: DOMRect, x: number, y: number): boolean {
  return x >= box.left && x <= box.right && y >= box.top && y <= box.bottom;
}

function connectModal(root: HTMLElement, dialog: HTMLDialogElement): () => void {
  const doc = root.ownerDocument;
  const page = doc.documentElement;
  let opener: HTMLElement | null = null;
  let savedOverflow: string | null = null;

  function lockScroll(): void {
    if (savedOverflow !== null) return;
    savedOverflow = page.style.overflow;
    page.style.overflow = 'hidden';
  }
  function unlockScroll(): void {
    if (savedOverflow === null) return;
    page.style.overflow = savedOverflow;
    savedOverflow = null;
  }
  function open(trigger: HTMLElement | null): void {
    if (dialog.open) return;
    opener = trigger;
    dialog.showModal();
    lockScroll();
  }
  function openFromLink(event: MouseEvent): void {
    if (event.defaultPrevented || root.id === '') return;
    const target = event.target;
    const link = target instanceof Element ? target.closest<HTMLElement>('a[href^="#"]') : null;
    if (link === null || decodeFragment(link.getAttribute('href') ?? '') !== root.id) return;
    event.preventDefault();
    open(link);
  }
  function closeOnBackdrop(event: MouseEvent): void {
    if (event.target !== dialog) return;
    if (isInside(dialog.getBoundingClientRect(), event.clientX, event.clientY)) return;
    dialog.close();
  }
  function syncScrollLock(): void {
    if (dialog.open) {
      lockScroll();
    } else {
      unlockScroll();
    }
  }
  function restoreFocus(): void {
    unlockScroll();
    const trigger = opener;
    opener = null;
    if (trigger !== null && trigger.isConnected && doc.activeElement !== trigger) trigger.focus();
  }

  doc.addEventListener('click', openFromLink);
  dialog.addEventListener('click', closeOnBackdrop);
  dialog.addEventListener('toggle', syncScrollLock);
  dialog.addEventListener('close', restoreFocus);
  const hash = doc.defaultView?.location.hash ?? '';
  if (root.id !== '' && decodeFragment(hash) === root.id) open(null);

  return () => {
    doc.removeEventListener('click', openFromLink);
    dialog.removeEventListener('click', closeOnBackdrop);
    dialog.removeEventListener('toggle', syncScrollLock);
    dialog.removeEventListener('close', restoreFocus);
    if (dialog.open) dialog.close();
    unlockScroll();
  };
}

siteRuntime.register({
  name: 'modal',
  init(root) {
    const dialog = root.querySelector('dialog');
    if (dialog === null || typeof dialog.showModal !== 'function') {
      console.warn('siteRuntime modal: needs a <dialog> the browser can open', root);
      return () => {};
    }
    return connectModal(root, dialog);
  },
});
