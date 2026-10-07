import type { Frame, Page } from '@playwright/test';

export type Violation = { rule: string; selector: string; detail: string };

export type AccessibilityOptions = { exclude?: string[]; isSitePage?: boolean };

export async function checkAccessibility(
  target: Page | Frame,
  options: AccessibilityOptions = {},
): Promise<Violation[]> {
  return target.evaluate(({ exclude = [], isSitePage = false }) => {
    const violations: { rule: string; selector: string; detail: string }[] = [];
    const INTERACTIVE =
      'button, a[href], input:not([type="hidden"]), select, textarea, [role="button"], [role="tab"], [role="menuitem"], [role="menuitemcheckbox"], [role="option"], [role="switch"], [role="checkbox"], [role="slider"], [role="combobox"]';
    const FOCUSABLE = `${INTERACTIVE}, [tabindex]:not([tabindex="-1"])`;
    const LARGE_TEXT_PX = 24;
    const LARGE_BOLD_TEXT_PX = 18.66;
    const BOLD_WEIGHT = 700;

    function isExcluded(element: Element): boolean {
      return exclude.some((selector) => element.closest(selector) !== null);
    }

    function describe(element: Element): string {
      const id = element.id === '' ? '' : `#${element.id}`;
      const classes = [...element.classList]
        .slice(0, 2)
        .map((name) => `.${name}`)
        .join('');
      const text = (element.textContent ?? '').trim().slice(0, 30);
      return `${element.tagName.toLowerCase()}${id}${classes}${text === '' ? '' : ` "${text}"`}`;
    }

    function isVisible(element: Element): boolean {
      if (!(element instanceof HTMLElement || element instanceof SVGElement)) return false;
      return element.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true });
    }

    function textOfIds(ids: string): string {
      const parts: string[] = [];
      for (const id of ids.split(/\s+/)) {
        const labelled = document.getElementById(id);
        if (labelled !== null) parts.push(labelled.textContent ?? '');
      }
      return parts.join(' ').trim();
    }

    function accessibleName(element: Element): string {
      const labelledBy = element.getAttribute('aria-labelledby');
      if (labelledBy !== null && textOfIds(labelledBy) !== '') return textOfIds(labelledBy);
      const label = element.getAttribute('aria-label');
      if (label !== null && label.trim() !== '') return label.trim();
      if (
        element instanceof HTMLInputElement ||
        element instanceof HTMLSelectElement ||
        element instanceof HTMLTextAreaElement
      ) {
        const labels = element.labels === null ? [] : [...element.labels];
        const fromLabels = labels
          .map((item) => item.textContent ?? '')
          .join(' ')
          .trim();
        if (fromLabels !== '') return fromLabels;
        if (
          element instanceof HTMLInputElement &&
          ['submit', 'button', 'reset'].includes(element.type)
        ) {
          return element.value;
        }
      }
      const text = (element.textContent ?? '').trim();
      if (text !== '') return text;
      for (const image of element.querySelectorAll('img[alt]')) {
        const alt = image.getAttribute('alt') ?? '';
        if (alt.trim() !== '') return alt.trim();
      }
      return (element.getAttribute('title') ?? '').trim();
    }

    function report(rule: string, element: Element, detail: string): void {
      if (isExcluded(element)) return;
      violations.push({ rule, selector: describe(element), detail });
    }

    for (const element of document.querySelectorAll(INTERACTIVE)) {
      if (!isVisible(element) || element.closest('[inert], [aria-hidden="true"]') !== null)
        continue;
      if (accessibleName(element) === '')
        report('name', element, 'Interactive element without an accessible name');
    }

    for (const image of document.querySelectorAll('img')) {
      if (!image.hasAttribute('alt')) report('alt', image, 'Image without an alt attribute');
    }

    const seenIds = new Map<string, number>();
    for (const element of document.querySelectorAll('[id]')) {
      seenIds.set(element.id, (seenIds.get(element.id) ?? 0) + 1);
    }
    for (const [id, count] of seenIds) {
      if (count > 1)
        violations.push({ rule: 'unique-id', selector: `#${id}`, detail: `Used ${count} times` });
    }
    for (const attribute of ['aria-labelledby', 'aria-describedby', 'aria-controls']) {
      for (const element of document.querySelectorAll(`[${attribute}]`)) {
        for (const id of (element.getAttribute(attribute) ?? '').split(/\s+/)) {
          if (id !== '' && document.getElementById(id) === null) {
            report('aria-reference', element, `${attribute} points to missing #${id}`);
          }
        }
      }
    }

    const html = document.documentElement;
    if ((html.getAttribute('lang') ?? '') === '')
      violations.push({ rule: 'lang', selector: 'html', detail: 'No lang attribute' });
    if (isSitePage && (html.getAttribute('dir') ?? '') === '')
      violations.push({ rule: 'dir', selector: 'html', detail: 'No dir attribute' });
    const mains = [...document.querySelectorAll('main, [role="main"]')].filter(isVisible);
    if (mains.length !== 1)
      violations.push({
        rule: 'main',
        selector: 'main',
        detail: `Found ${mains.length} main landmarks`,
      });

    if (isSitePage) {
      const headings = [...document.querySelectorAll('h1, h2, h3, h4, h5, h6')].filter(isVisible);
      const levels = headings.map((heading) => Number(heading.tagName.slice(1)));
      const h1Count = levels.filter((level) => level === 1).length;
      if (h1Count !== 1)
        violations.push({ rule: 'h1', selector: 'h1', detail: `Found ${h1Count} h1 headings` });
      let previous = 0;
      for (const [index, level] of levels.entries()) {
        const heading = headings[index];
        if (heading !== undefined && previous > 0 && level > previous + 1) {
          report('heading-order', heading, `h${level} follows h${previous}`);
        }
        previous = level;
      }
    }

    for (const element of document.querySelectorAll('[tabindex]')) {
      if (Number(element.getAttribute('tabindex')) > 0)
        report('tabindex', element, 'Positive tabindex');
    }
    for (const hidden of document.querySelectorAll('[aria-hidden="true"]')) {
      for (const focusable of hidden.querySelectorAll(FOCUSABLE)) {
        if (isVisible(focusable))
          report('hidden-focus', focusable, 'Focusable element inside aria-hidden');
      }
    }

    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    const context = canvas.getContext('2d', { willReadFrequently: true });

    type Rgba = { red: number; green: number; blue: number; alpha: number };

    function toRgba(color: string): Rgba | null {
      if (context === null) return null;
      context.clearRect(0, 0, 1, 1);
      context.fillStyle = '#000';
      context.fillStyle = color;
      context.fillRect(0, 0, 1, 1);
      const [red = 0, green = 0, blue = 0, alpha = 0] = context.getImageData(0, 0, 1, 1).data;
      return { red, green, blue, alpha: alpha / 255 };
    }

    function channel(value: number): number {
      const scaled = value / 255;
      return scaled <= 0.03928 ? scaled / 12.92 : ((scaled + 0.055) / 1.055) ** 2.4;
    }

    function luminance({ red, green, blue }: Rgba): number {
      return 0.2126 * channel(red) + 0.7152 * channel(green) + 0.0722 * channel(blue);
    }

    function backgroundOf(element: Element): Rgba | null {
      let current: Element | null = element;
      while (current !== null) {
        const style = getComputedStyle(current);
        if (style.backgroundImage !== 'none') return null;
        const color = toRgba(style.backgroundColor);
        if (color !== null && color.alpha >= 0.99) return color;
        if (color !== null && color.alpha > 0) return null;
        current = current.parentElement;
      }
      return toRgba(getComputedStyle(document.body).backgroundColor);
    }

    const checked = new Set<Element>();
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
      const parent = node.parentElement;
      if (parent === null || checked.has(parent) || (node.nodeValue ?? '').trim() === '') continue;
      checked.add(parent);
      if (
        !isVisible(parent) ||
        isExcluded(parent) ||
        parent.closest('[aria-hidden="true"], [inert], option, select') !== null
      )
        continue;
      if (parent.closest('button:disabled, input:disabled, [aria-disabled="true"]') !== null)
        continue;
      const style = getComputedStyle(parent);
      const foreground = toRgba(style.color);
      const background = backgroundOf(parent);
      if (foreground === null || background === null || foreground.alpha < 0.99) continue;
      const lighter = Math.max(luminance(foreground), luminance(background));
      const darker = Math.min(luminance(foreground), luminance(background));
      const ratio = (lighter + 0.05) / (darker + 0.05);
      const size = Number.parseFloat(style.fontSize);
      const isBold = Number(style.fontWeight) >= BOLD_WEIGHT;
      const isLarge = size >= LARGE_TEXT_PX || (isBold && size >= LARGE_BOLD_TEXT_PX);
      const required = isLarge ? 3 : 4.5;
      if (ratio + 0.01 < required) {
        report('contrast', parent, `Contrast ${ratio.toFixed(2)}:1, needs ${required}:1`);
      }
    }

    return violations;
  }, options);
}
