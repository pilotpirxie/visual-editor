const CONSENT_KEY = 'site-consent';
const CHOICES = ['accepted', 'declined'];

function connectConsent(root: HTMLElement, dialog: HTMLDialogElement): () => void {
  const { storage } = siteRuntime;

  function rememberChoice(event: MouseEvent): void {
    const target = event.target;
    const button = target instanceof Element ? target.closest<HTMLElement>('[data-consent]') : null;
    const choice = button?.dataset.consent ?? '';
    if (button === null || !CHOICES.includes(choice)) return;
    storage.setItem(CONSENT_KEY, choice);
    dialog.close();
  }

  if (storage.getItem(CONSENT_KEY) === null) dialog.show();
  root.addEventListener('click', rememberChoice);

  return () => {
    root.removeEventListener('click', rememberChoice);
    if (dialog.open) dialog.close();
  };
}

siteRuntime.register({
  name: 'consent',
  init(root) {
    const dialog = root.querySelector('dialog');
    const hasChoices = root.querySelector('[data-consent]') !== null;
    if (dialog === null || !hasChoices || typeof dialog.show !== 'function') {
      console.warn('siteRuntime consent: needs a <dialog> with [data-consent] buttons', root);
      return () => {};
    }
    return connectConsent(root, dialog);
  },
});
