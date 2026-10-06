import type { FontSelection } from '../../app/types';
import { googleFontsHref } from '../../render/fonts';

const FONT_LINK = 'link[data-ve-fonts]';

async function loadFaces(doc: Document, fonts: FontSelection[]): Promise<void> {
  if (!('fonts' in doc)) return;
  const loads: Promise<FontFace[]>[] = [];
  for (const { family, weights } of fonts) {
    for (const weight of weights) loads.push(doc.fonts.load(`${weight} 1em "${family}"`));
  }
  await Promise.allSettled(loads);
}

export function syncFontLink(doc: Document, fonts: FontSelection[]): void {
  const href = googleFontsHref(fonts);
  const older = [...doc.head.querySelectorAll<HTMLLinkElement>(FONT_LINK)];
  if (older.at(-1)?.getAttribute('href') === href) return;

  function removeOlder(): void {
    for (const link of older) link.remove();
  }

  if (href === null) {
    removeOlder();
    return;
  }
  const link = doc.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  link.dataset.veFonts = '';
  link.addEventListener('load', () => void loadFaces(doc, fonts).finally(removeOlder), {
    once: true,
  });
  link.addEventListener(
    'error',
    () => {
      console.warn(`Canvas: could not load Google Fonts from ${href}`);
      removeOlder();
    },
    { once: true },
  );
  doc.head.append(link);
}
