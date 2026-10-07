import type { JSX } from 'react';

const ANNOUNCER_ID = 've-live-announcer';

export function announce(text: string): void {
  const region = document.getElementById(ANNOUNCER_ID);
  if (region === null) return;
  region.textContent = '';
  window.requestAnimationFrame(() => {
    region.textContent = text;
  });
}

export function LiveAnnouncer(): JSX.Element {
  return <div id={ANNOUNCER_ID} className="ve-visually-hidden" aria-live="polite" />;
}
