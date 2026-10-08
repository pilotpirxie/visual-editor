import { act } from 'react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { noticeDismissed } from '../../app/editorSlice';
import { dispatch, store } from '../../app/store';
import type { Project } from '../../app/types';
import { BUILTIN_PRESETS } from '../../presets/presets';
import { loadStarter, STARTERS, type StarterInfo } from '../../starters/starters';
import { changeValue, choiceInput, click, getButton, render, runInAct } from '../../test/dom';
import { ensureIconSets } from '../icons/ensureIconSets';
import { StarterPreview } from './StarterPreview';

vi.mock('../icons/ensureIconSets', () => ({
  ensureIconSets: vi.fn(async () => {}),
  ensureProjectIconSets: vi.fn(async () => {}),
}));

const MIDNIGHT = BUILTIN_PRESETS[1];
const PLAYFUL = BUILTIN_PRESETS[2];

type Deferred = { promise: Promise<void>; resolve(): void };

function deferred(): Deferred {
  let resolve = (): void => {};
  const promise = new Promise<void>((settle) => {
    resolve = settle;
  });
  return { promise, resolve };
}

let saas: StarterInfo = STARTERS[0];
let saasProject: Project;

type Preview = {
  container: HTMLDivElement;
  onUse: ReturnType<typeof vi.fn<(shown: Project) => void>>;
  onClose: ReturnType<typeof vi.fn<() => void>>;
};

function renderPreview(isDisabled = false): Preview {
  const onUse = vi.fn<(shown: Project) => void>();
  const onClose = vi.fn<() => void>();
  const { container } = render(
    <StarterPreview
      starter={saas}
      project={saasProject}
      isDisabled={isDisabled}
      onUse={onUse}
      onClose={onClose}
    />,
  );
  return { container, onUse, onClose };
}

function frameOf(container: HTMLElement): HTMLIFrameElement {
  const frame = container.querySelector<HTMLIFrameElement>('.ve-starter-frame');
  if (frame === null) throw new Error('The preview frame is missing');
  return frame;
}

function frameHtml(container: HTMLElement): string {
  return frameOf(container).getAttribute('srcdoc') ?? '';
}

function frameDocument(container: HTMLElement): Document {
  const doc = frameOf(container).contentDocument;
  if (doc === null) throw new Error('The preview frame has no document');
  return doc;
}

function selectLabelled(container: HTMLElement, label: string): HTMLSelectElement {
  for (const select of container.querySelectorAll('select')) {
    const name = select.getAttribute('aria-label') ?? select.labels?.[0]?.textContent;
    if (name === label) return select;
  }
  throw new Error(`No select labelled ${label}`);
}

async function waitForFrameLoad(container: HTMLElement): Promise<void> {
  await vi.waitFor(() => {
    const fontsLink = frameDocument(container).head.querySelector('link[rel="stylesheet"]');
    if (fontsLink === null) throw new Error('The preview frame has not loaded yet');
  });
}

function addToFrame(container: HTMLElement, html: string): Document {
  const doc = frameDocument(container);
  doc.body.innerHTML = html;
  return doc;
}

function clickInFrame(element: Element | null): boolean {
  if (element === null) throw new Error('Nothing to click in the frame');
  const event = new MouseEvent('click', { bubbles: true, cancelable: true });
  runInAct(() => {
    element.dispatchEvent(event);
  });
  return event.defaultPrevented;
}

function noticeTexts(): string[] {
  const texts: string[] = [];
  for (const notice of store.getState().editor.notices) texts.push(notice.text);
  return texts;
}

beforeAll(async () => {
  const starter = STARTERS.find((item) => item.id === 'saas');
  if (starter === undefined) throw new Error('The SaaS starter is missing');
  saas = starter;
  saasProject = await loadStarter(starter);
});

beforeEach(() => {
  for (const notice of store.getState().editor.notices) dispatch(noticeDismissed(notice.id));
});

describe('StarterPreview pages and devices', () => {
  it('opens on the home page at desktop width in the starter’s own design', () => {
    const { container } = renderPreview();
    expect(container.querySelector('h2')?.textContent).toBe('SaaS product');
    expect(frameOf(container).title).toBe('SaaS product preview');
    expect(selectLabelled(container, 'Page').value).toBe(saasProject.pages.homePageId);
    expect(selectLabelled(container, 'Design').value).toBe('clean');
    expect(choiceInput(container, 'Desktop (1440 px)')?.checked).toBe(true);
    expect(frameHtml(container)).toContain(
      'From raw interviews to roadmap decisions in one afternoon',
    );
  });

  it('renders the page without scripts and without the fonts link, which is added after load', async () => {
    const { container } = renderPreview();
    expect(frameHtml(container)).not.toContain('<script');
    expect(frameHtml(container)).not.toContain('fonts.googleapis.com');
    await waitForFrameLoad(container);
    const fontsLink = frameDocument(container).head.querySelector('link[rel="stylesheet"]');
    expect(fontsLink?.getAttribute('href')).toContain('fonts.googleapis.com');
  });

  it('lists every page and switches the preview to the chosen one', () => {
    const { container } = renderPreview();
    const pageSelect = selectLabelled(container, 'Page');
    expect(pageSelect.options).toHaveLength(saasProject.pages.ids.length);
    changeValue(pageSelect, 'pricing');
    expect(frameHtml(container)).toContain('Pricing that fits how often you talk to customers');
  });

  it('offers desktop, tablet and phone sizes and fits the frame to the chosen one', () => {
    const { container } = renderPreview();
    const values: string[] = [];
    for (const radio of container.querySelectorAll<HTMLInputElement>('input[type="radio"]')) {
      values.push(radio.value);
    }
    expect(values).toEqual(['desktop', 'tablet', 'phone']);
    expect(frameOf(container).style.width).toBe('1440px');
    click(choiceInput(container, 'Tablet (768 px)'));
    expect(frameOf(container).style.width).toBe('768px');
    click(choiceInput(container, 'Phone (375 px)'));
    expect(frameOf(container).style.width).toBe('375px');
  });

  it('keeps the same frame when only the device changes', () => {
    const { container } = renderPreview();
    const frame = frameOf(container);
    click(choiceInput(container, 'Phone (375 px)'));
    expect(frameOf(container)).toBe(frame);
  });
});

describe('StarterPreview links inside the frame', () => {
  it('opens the linked page when a page link is clicked', async () => {
    const { container } = renderPreview();
    await waitForFrameLoad(container);
    const doc = addToFrame(container, '<nav><a href="pricing.html"><span>Pricing</span></a></nav>');
    const isPrevented = clickInFrame(doc.querySelector('span'));
    expect(isPrevented).toBe(true);
    expect(selectLabelled(container, 'Page').value).toBe('pricing');
  });

  it('scrolls to a section on the same page', async () => {
    const { container } = renderPreview();
    await waitForFrameLoad(container);
    const doc = addToFrame(container, '<a href="#faq">FAQ</a><section id="faq"></section>');
    const section = doc.getElementById('faq');
    const scrollIntoView = vi.fn();
    if (section !== null) section.scrollIntoView = scrollIntoView;
    expect(clickInFrame(doc.querySelector('a'))).toBe(true);
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    expect(selectLabelled(container, 'Page').value).toBe(saasProject.pages.homePageId);
  });

  it('scrolls without reloading when a link points to a section of the page shown', async () => {
    const { container } = renderPreview();
    await waitForFrameLoad(container);
    const frame = frameOf(container);
    const doc = addToFrame(container, '<a href="index.html#faq">FAQ</a><div id="faq"></div>');
    const target = doc.getElementById('faq');
    const scrollIntoView = vi.fn();
    if (target !== null) target.scrollIntoView = scrollIntoView;
    clickInFrame(doc.querySelector('a'));
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    expect(frameOf(container)).toBe(frame);
  });

  it('keeps visitors inside the preview when they click an external link', async () => {
    const { container } = renderPreview();
    await waitForFrameLoad(container);
    const doc = addToFrame(container, '<a href="https://example.com/">Elsewhere</a>');
    expect(clickInFrame(doc.querySelector('a'))).toBe(true);
    expect(selectLabelled(container, 'Page').value).toBe(saasProject.pages.homePageId);
  });

  it('ignores clicks that are not on a link', async () => {
    const { container } = renderPreview();
    await waitForFrameLoad(container);
    const doc = addToFrame(container, '<p>Plain text</p>');
    expect(clickInFrame(doc.querySelector('p'))).toBe(false);
  });

  it('stops forms from being sent', async () => {
    const { container } = renderPreview();
    await waitForFrameLoad(container);
    const doc = addToFrame(container, '<form action="https://example.com/"></form>');
    const event = new Event('submit', { bubbles: true, cancelable: true });
    doc.querySelector('form')?.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
  });
});

describe('StarterPreview designs', () => {
  it('shows the starter in another preset once its icons are ready', async () => {
    const { container } = renderPreview();
    changeValue(selectLabelled(container, 'Design'), 'midnight');
    await vi.waitFor(() => expect(selectLabelled(container, 'Design').value).toBe('midnight'));
    expect(ensureIconSets).toHaveBeenCalledWith([MIDNIGHT.designSystem.iconSet]);
    const background = MIDNIGHT.designSystem.tokens['--color-background']?.value ?? '';
    expect(frameHtml(container)).toContain(`--color-background: ${background}`);
  });

  it('shows the design the user picked last when an earlier pick loads later', async () => {
    const midnightIcons = deferred();
    vi.mocked(ensureIconSets).mockReturnValueOnce(midnightIcons.promise);
    const { container } = renderPreview();
    changeValue(selectLabelled(container, 'Design'), 'midnight');
    changeValue(selectLabelled(container, 'Design'), 'playful');
    await vi.waitFor(() => expect(selectLabelled(container, 'Design').value).toBe('playful'));
    await act(async () => {
      midnightIcons.resolve();
      await midnightIcons.promise;
    });
    expect(selectLabelled(container, 'Design').value).toBe(PLAYFUL.id);
  });

  it('keeps the current design and explains when a preset cannot be loaded', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(ensureIconSets).mockRejectedValueOnce(new Error('Offline'));
    const { container } = renderPreview();
    const htmlBefore = frameHtml(container);
    changeValue(selectLabelled(container, 'Design'), 'midnight');
    await vi.waitFor(() =>
      expect(noticeTexts()).toContain('The Midnight design could not be loaded.'),
    );
    expect(selectLabelled(container, 'Design').value).toBe('clean');
    expect(frameHtml(container)).toBe(htmlBefore);
  });
});

describe('StarterPreview actions', () => {
  it('uses the starter as it is when the design was not changed', () => {
    const { container, onUse } = renderPreview();
    click(getButton(container, 'Use this starter'));
    expect(onUse).toHaveBeenCalledWith(saasProject);
  });

  it('uses the starter with the design chosen in the preview', async () => {
    const { container, onUse } = renderPreview();
    changeValue(selectLabelled(container, 'Design'), 'midnight');
    await vi.waitFor(() => expect(selectLabelled(container, 'Design').value).toBe('midnight'));
    click(getButton(container, 'Use this starter'));
    const shown = onUse.mock.calls[0][0];
    expect(shown.designSystem.presetId).toBe('midnight');
    expect(shown.pages).toBe(saasProject.pages);
    expect(saasProject.designSystem.presetId).toBe('clean');
  });

  it('does not offer to use the starter while a project is being created', () => {
    const { container, onUse } = renderPreview(true);
    expect(getButton(container, 'Use this starter').disabled).toBe(true);
    click(getButton(container, 'Use this starter'));
    expect(onUse).not.toHaveBeenCalled();
  });

  it('closes with Close', () => {
    const { container, onClose, onUse } = renderPreview();
    click(getButton(container, 'Close'));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onUse).not.toHaveBeenCalled();
  });
});
