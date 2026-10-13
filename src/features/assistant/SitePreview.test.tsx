import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Project } from '../../app/types';
import { CLEAN_PRESET, withoutPresetId } from '../../presets/presets';
import { choiceInput, click, render, runInAct } from '../../test/dom';
import { buildSiteProject, UNWRITTEN_CLASS, type SiteWriting } from './buildSite';
import { showPage, SitePreview } from './SitePreview';
import { parseSitePlan, type SectionWriting } from './siteSteps';

const look = withoutPresetId(structuredClone(CLEAN_PRESET.designSystem));

const PLAN = parseSitePlan({
  title: 'Crumb & Co',
  description: 'A bakery.',
  language: 'en',
  header: 'nav-simple',
  footer: 'footer-simple',
  pages: [
    {
      name: 'Home',
      slug: 'home',
      purpose: 'Welcome',
      sections: [
        { block: 'hero-centered', custom: '', theme: 'default', note: '' },
        { block: 'cta-image', custom: '', theme: 'default', note: '' },
      ],
    },
    {
      name: 'Menu',
      slug: 'menu',
      purpose: 'Prices',
      sections: [{ block: 'hero-app', custom: '', theme: 'default', note: '' }],
    },
  ],
});

const UNWRITTEN: SectionWriting = { kind: 'unwritten' };
const HERO: SectionWriting = { kind: 'values', values: { title: 'Bread worth getting up for' } };
const PICTURE = 'data:image/webp;base64,aGVsbG8=';

function site(home: SiteWriting['shared']): Project {
  return buildSiteProject(PLAN, look, {
    shared: [UNWRITTEN, UNWRITTEN],
    pages: { home, menu: [UNWRITTEN] },
  });
}

function frameDocument(): Document {
  const doc = document.implementation.createHTMLDocument();
  const style = doc.createElement('style');
  style.id = 'site-styles';
  doc.head.append(style);
  return doc;
}

function homeOf(project: Project): string {
  return project.pages.homePageId;
}

function withPicture(project: Project): Project {
  const painted = structuredClone(project);
  for (const block of Object.values(painted.blocks.entities)) {
    if (block.kind !== 'component' || block.componentId !== 'cta-image') continue;
    block.values.image = {
      source: 'upload',
      name: 'site-image-1.webp',
      alt: 'A cake',
      decorative: false,
      src: PICTURE,
      width: 1200,
      height: 900,
    };
  }
  return painted;
}

function allowMotion(): void {
  vi.spyOn(window, 'matchMedia').mockImplementation((media) => ({
    media,
    matches: media === '(prefers-reduced-motion: no-preference)',
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  }));
}

async function loadedFrame(container: HTMLElement, selector: string): Promise<Document> {
  const frame = container.querySelector('iframe');
  await vi.waitFor(() => {
    expect(frame?.contentDocument?.querySelector(selector)).not.toBeNull();
  });
  const doc = frame?.contentDocument ?? null;
  const view = doc?.defaultView ?? null;
  if (doc === null || view === null) throw new Error('The preview frame has no document');
  vi.spyOn(view, 'scrollTo').mockImplementation(() => {});
  return doc;
}

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('showPage', () => {
  it('shows planned sections as unwritten and sharpens them in place when their text arrives', () => {
    const doc = frameDocument();
    const planned = site([UNWRITTEN, UNWRITTEN]);
    expect(showPage(doc, planned, homeOf(planned))).toEqual({ sections: [], pictures: [] });
    const hero = doc.querySelector('.b-hero-centered');
    expect(hero?.classList.contains(UNWRITTEN_CLASS)).toBe(true);
    expect(doc.querySelectorAll(`.${UNWRITTEN_CLASS}`)).toHaveLength(4);
    expect(doc.documentElement.lang).toBe('en');
    expect(doc.getElementById('site-styles')?.textContent).toContain('--color-primary');

    const written = site([HERO, UNWRITTEN]);
    const changes = showPage(doc, written, homeOf(written));
    expect(changes.sections).toHaveLength(1);
    expect(changes.sections[0]).toBe(hero);
    expect(changes.pictures).toHaveLength(0);
    expect(doc.querySelector('.b-hero-centered')).toBe(hero);
    expect(hero?.classList.contains(UNWRITTEN_CLASS)).toBe(false);
    expect(hero?.querySelector('h1')?.textContent).toBe('Bread worth getting up for');
    expect(doc.querySelectorAll(`.${UNWRITTEN_CLASS}`)).toHaveLength(3);
  });

  it('points at a picture that was created and keeps live maps out', () => {
    const doc = frameDocument();
    const written = site([HERO, { kind: 'values', values: {} }]);
    showPage(doc, written, homeOf(written));
    const picture = doc.querySelector('.b-cta-image img');
    expect(picture).not.toBeNull();

    const painted = withPicture(written);
    const changes = showPage(doc, painted, homeOf(painted));
    expect(changes.sections).toHaveLength(0);
    expect(changes.pictures).toHaveLength(1);
    expect(changes.pictures[0]).toBe(picture);
    expect(picture?.getAttribute('src')).toBe(PICTURE);
    expect(showPage(doc, painted, homeOf(painted))).toEqual({ sections: [], pictures: [] });
    expect(doc.querySelector('iframe')).toBeNull();
  });

  it('lists every section written at once, top first, and not the pictures inside them', () => {
    const doc = frameDocument();
    const planned = site([UNWRITTEN, UNWRITTEN]);
    showPage(doc, planned, homeOf(planned));
    const hero = doc.querySelector('.b-hero-centered');
    const cta = doc.querySelector('.b-cta-image');

    const written = withPicture(site([HERO, { kind: 'values', values: {} }]));
    const changes = showPage(doc, written, homeOf(written));
    expect(changes.sections).toHaveLength(2);
    expect(changes.sections[0]).toBe(hero);
    expect(changes.sections[1]).toBe(cta);
    expect(cta?.querySelector('img')?.getAttribute('src')).toBe(PICTURE);
    expect(changes.pictures).toHaveLength(0);
  });
});

describe('SitePreview', () => {
  it('sketches a page in neutral colors until the look is known', () => {
    const { container } = render(<SitePreview look={null} site={null} changedPage={null} />);
    const sketch = container.querySelector<HTMLElement>('.ve-site-sketch');
    expect(sketch?.getAttribute('aria-hidden')).toBe('true');
    expect(sketch?.getAttribute('style') ?? '').toBe('');
    expect(container.querySelectorAll('.ve-sketch-bar')).toHaveLength(2);
  });

  it('paints the sketch in the colors of the look and never shows font names', () => {
    const { container } = render(<SitePreview look={look} site={null} changedPage={null} />);
    const sketch = container.querySelector<HTMLElement>('.ve-site-sketch');
    expect(sketch?.style.getPropertyValue('--sketch-primary')).toBe(
      look.tokens['--color-primary'].value,
    );
    expect(sketch?.style.getPropertyValue('--sketch-background')).toBe(
      look.tokens['--color-background'].value,
    );
    expect(sketch?.textContent).toBe('');
    expect(container.querySelector('link')).toBeNull();
    expect(container.querySelectorAll('.ve-sketch-bar')).toHaveLength(2);
  });

  it('shows the home page at the real width of the preview and switches pages in one frame', async () => {
    const planned = site([HERO, UNWRITTEN]);
    const { container, rerender } = render(
      <SitePreview look={look} site={planned} changedPage={null} />,
    );
    const frame = container.querySelector('iframe');
    expect(frame?.getAttribute('aria-hidden')).toBe('true');
    expect(frame?.tabIndex).toBe(-1);
    expect(frame?.getAttribute('style')).toBeNull();
    expect(frame?.parentElement?.className).toBe('ve-site-preview');
    const doc = await loadedFrame(container, 'h1');
    expect(doc.querySelector('h1')?.textContent).toBe('Bread worth getting up for');
    expect(doc.body.inert).toBe(true);
    expect(choiceInput(container, 'Home')?.checked).toBe(true);

    click(choiceInput(container, 'Menu'));
    expect(doc.querySelector('.b-hero-app')).not.toBeNull();
    expect(doc.querySelector('.b-hero-centered')).toBeNull();
    expect(doc.defaultView?.scrollTo).toHaveBeenCalledWith(0, 0);

    rerender(<SitePreview look={look} site={site([HERO, HERO])} changedPage={null} />);
    expect(container.querySelector('iframe')).toBe(frame);
    expect(choiceInput(container, 'Menu')?.checked).toBe(true);
    expect(doc.querySelector('.b-hero-app')).not.toBeNull();
  });

  it('moves to the page that changed, once the page shown has had its time', async () => {
    const planned = site([HERO, UNWRITTEN]);
    const { container, rerender } = render(
      <SitePreview look={look} site={planned} changedPage={null} />,
    );
    const doc = await loadedFrame(container, 'h1');
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });

    rerender(<SitePreview look={look} site={planned} changedPage="menu" />);
    expect(choiceInput(container, 'Home')?.checked).toBe(true);
    runInAct(() => vi.advanceTimersByTime(0));
    expect(choiceInput(container, 'Menu')?.checked).toBe(true);
    expect(doc.querySelector('.b-hero-app')).not.toBeNull();
    expect(doc.defaultView?.scrollTo).toHaveBeenCalledWith(0, 0);

    rerender(<SitePreview look={look} site={planned} changedPage="home" />);
    runInAct(() => vi.advanceTimersByTime(2499));
    expect(choiceInput(container, 'Menu')?.checked).toBe(true);
    runInAct(() => vi.advanceTimersByTime(1));
    expect(choiceInput(container, 'Home')?.checked).toBe(true);
    expect(doc.querySelector('.b-hero-centered')).not.toBeNull();
  });

  it('stays on a page picked by hand', async () => {
    const planned = site([HERO, UNWRITTEN]);
    const { container, rerender } = render(
      <SitePreview look={look} site={planned} changedPage={null} />,
    );
    await loadedFrame(container, 'h1');
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });

    click(choiceInput(container, 'Menu'));
    rerender(<SitePreview look={look} site={planned} changedPage="home" />);
    runInAct(() => vi.advanceTimersByTime(10_000));
    expect(choiceInput(container, 'Menu')?.checked).toBe(true);
  });

  it('stops following once the preview is scrolled by hand', async () => {
    const planned = site([HERO, UNWRITTEN]);
    const { container, rerender } = render(
      <SitePreview look={look} site={planned} changedPage={null} />,
    );
    const doc = await loadedFrame(container, 'h1');
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });

    doc.dispatchEvent(new Event('wheel'));
    rerender(<SitePreview look={look} site={planned} changedPage="menu" />);
    runInAct(() => vi.advanceTimersByTime(10_000));
    expect(choiceInput(container, 'Home')?.checked).toBe(true);
  });

  it('moves nothing when motion is reduced', async () => {
    const planned = site([UNWRITTEN, UNWRITTEN]);
    const { container, rerender } = render(
      <SitePreview look={look} site={planned} changedPage={null} />,
    );
    const doc = await loadedFrame(container, '.b-hero-centered');
    const animate = vi.fn<Element['animate']>();
    for (const element of [doc.body, ...doc.body.querySelectorAll('*')]) element.animate = animate;

    rerender(<SitePreview look={look} site={site([HERO, UNWRITTEN])} changedPage={null} />);
    expect(doc.querySelector('h1')?.textContent).toBe('Bread worth getting up for');
    click(choiceInput(container, 'Menu'));
    expect(doc.querySelector('.b-hero-app')).not.toBeNull();
    expect(animate).not.toHaveBeenCalled();
    expect(doc.defaultView?.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'auto' });
  });

  it('brings new text in section by section, fades pictures and pages in when motion is allowed', async () => {
    allowMotion();
    const planned = site([UNWRITTEN, UNWRITTEN]);
    const { container, rerender } = render(
      <SitePreview look={look} site={planned} changedPage={null} />,
    );
    const doc = await loadedFrame(container, '.b-hero-centered');
    const animate = vi.fn<Element['animate']>();
    for (const element of [doc.body, ...doc.body.querySelectorAll('*')]) element.animate = animate;

    const written = site([HERO, { kind: 'values', values: {} }]);
    rerender(<SitePreview look={look} site={written} changedPage={null} />);
    expect(animate).toHaveBeenCalledTimes(2);
    expect(animate.mock.calls[0][1]).toMatchObject({ delay: 0, fill: 'backwards' });
    expect(animate.mock.calls[1][1]).toMatchObject({ delay: 140, fill: 'backwards' });
    expect(doc.defaultView?.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });

    rerender(<SitePreview look={look} site={withPicture(written)} changedPage={null} />);
    expect(animate).toHaveBeenCalledTimes(3);
    expect(animate.mock.calls[2][0]).toEqual([
      { opacity: 0, scale: 1.05 },
      { opacity: 1, scale: 1 },
    ]);

    click(choiceInput(container, 'Menu'));
    expect(animate).toHaveBeenCalledTimes(4);
    expect(animate.mock.calls[3][1]).toMatchObject({ duration: 320 });
  });
});
