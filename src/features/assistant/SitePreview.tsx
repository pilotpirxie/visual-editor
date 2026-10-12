import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type JSX,
  type SyntheticEvent,
} from 'react';
import type { DesignSystem, Project } from '../../app/types';
import { builtInComponents } from '../../components/registry';
import { textDirection } from '../../render/direction';
import { standalonePageParts } from '../../render/exportSite';
import { googleFontsHref } from '../../render/fonts';
import { syncFontLink } from '../canvas/fontLink';
import { morphChildren } from '../canvas/morph';
import { UNWRITTEN_CLASS } from './buildSite';
import { SegmentedControl, useMediaQuery } from '../../../packages/ui/src';

type SitePreviewProps = {
  look: DesignSystem | null;
  site: Project | null;
  changedPage: string | null;
};

type PreviewPage = { id: string; slug: string; name: string };

type Following = 'site' | 'page' | 'nothing';

export type PageChanges = { sections: Element[]; pictures: Element[] };

const STYLE_ID = 'site-styles';
const MOTION_QUERY = '(prefers-reduced-motion: no-preference)';
const PAGE_STAY_MS = 2500;
const LEAD_SHARE = 0.15;
const SECTION_GAP_MS = 140;
const SECTION_IN_MS = 600;
const PICTURE_IN_MS = 500;
const PAGE_IN_MS = 320;
const USER_SCROLL_EVENTS = ['wheel', 'touchstart', 'keydown'];
const HEX_COLOR = /^#[0-9a-f]{3,8}$/i;

const SECTION_IN: Keyframe[] = [
  { opacity: 0.45, filter: 'blur(10px) saturate(0.4)', translate: '0 16px' },
  { opacity: 1, filter: 'blur(0) saturate(1)', translate: '0 0' },
];
const PICTURE_IN: Keyframe[] = [
  { opacity: 0, scale: 1.05 },
  { opacity: 1, scale: 1 },
];
const PAGE_IN: Keyframe[] = [
  { opacity: 0, translate: '0 24px' },
  { opacity: 1, translate: '0 0' },
];

const PREVIEW_CSS = [
  `.${UNWRITTEN_CLASS} { filter: blur(10px) saturate(0.4); opacity: 0.45; }`,
  '@media (prefers-reduced-motion: no-preference) {',
  `  .${UNWRITTEN_CLASS} { animation: site-writing 1.2s ease-in-out infinite alternate; }`,
  `  .${UNWRITTEN_CLASS}:nth-child(3n + 2) { animation-delay: 0.4s; }`,
  `  .${UNWRITTEN_CLASS}:nth-child(3n) { animation-delay: 0.8s; }`,
  '}',
  '@keyframes site-writing { to { opacity: 0.15; } }',
].join('\n');

const FRAME_DOCUMENT = [
  '<!doctype html>',
  '<html>',
  '<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">',
  `<style id="${STYLE_ID}"></style>`,
  `<style>${PREVIEW_CSS}</style>`,
  '</head>',
  '<body></body>',
  '</html>',
].join('\n');

type SketchColor = { property: `--${string}`; token: string };

const SKETCH_COLORS: readonly SketchColor[] = [
  { property: '--sketch-background', token: '--color-background' },
  { property: '--sketch-surface', token: '--color-surface' },
  { property: '--sketch-border', token: '--color-border' },
  { property: '--sketch-text', token: '--color-text' },
  { property: '--sketch-muted', token: '--color-text-muted' },
  { property: '--sketch-primary', token: '--color-primary' },
];

export function showPage(doc: Document, site: Project, pageId: string): PageChanges {
  const { styles, body } = standalonePageParts(site, pageId, builtInComponents, true);
  const { language } = site.settings;
  doc.documentElement.lang = language;
  doc.documentElement.dir = textDirection(language);
  const style = doc.getElementById(STYLE_ID);
  if (style !== null && style.textContent !== styles) style.textContent = styles;
  syncFontLink(doc, site.designSystem.fonts);

  const unwritten = [...doc.body.querySelectorAll(`.${UNWRITTEN_CLASS}`)];
  const pictures = [...doc.images];
  const sources: (string | null)[] = [];
  for (const picture of pictures) sources.push(picture.getAttribute('src'));
  morphChildren(doc.body, body);

  const changes: PageChanges = { sections: [], pictures: [] };
  for (const section of unwritten) {
    const isWritten = section.isConnected && !section.classList.contains(UNWRITTEN_CLASS);
    if (isWritten) changes.sections.push(section);
  }
  for (const [index, picture] of pictures.entries()) {
    const isChanged = picture.isConnected && picture.getAttribute('src') !== sources[index];
    if (!isChanged) continue;
    let isInNewSection = false;
    for (const section of changes.sections) {
      if (section.contains(picture)) isInNewSection = true;
    }
    if (!isInNewSection) changes.pictures.push(picture);
  }
  return changes;
}

function glideTo(target: Element, isMotionAllowed: boolean): void {
  const view = target.ownerDocument.defaultView;
  if (view === null) return;
  const lead = view.innerHeight * LEAD_SHARE;
  const top = target.getBoundingClientRect().top + view.scrollY - lead;
  view.scrollTo({ top: Math.max(0, top), behavior: isMotionAllowed ? 'smooth' : 'auto' });
}

function pagesOf(site: Project): PreviewPage[] {
  const pages: PreviewPage[] = [];
  for (const id of site.pages.ids) {
    const page = site.pages.entities[id];
    if (page !== undefined) pages.push({ id, slug: page.slug, name: page.name });
  }
  return pages;
}

function LookSketch({ look }: { look: DesignSystem | null }): JSX.Element {
  const style: CSSProperties = {};
  let headingFamily = '';
  let bodyFamily = '';
  let fontsHref: string | null = null;
  if (look !== null) {
    for (const { property, token } of SKETCH_COLORS) {
      const color = look.tokens[token]?.value ?? '';
      if (HEX_COLOR.test(color)) style[property] = color;
    }
    for (const font of look.fonts) {
      if (font.role === 'heading') headingFamily = font.family;
      if (font.role === 'body') bodyFamily = font.family;
    }
    fontsHref = googleFontsHref(look.fonts);
  }
  const hasFonts = headingFamily !== '' && bodyFamily !== '';
  const bodyLine = headingFamily === bodyFamily ? 'for headings and text' : `with ${bodyFamily}`;

  return (
    <div className="ve-site-preview ve-site-sketch" style={style} aria-hidden="true">
      {fontsHref !== null && <link rel="stylesheet" href={fontsHref} />}
      <div className="ve-sketch-nav">
        <span className="ve-sketch-logo" />
        <span className="ve-sketch-line" />
        <span className="ve-sketch-line" />
        <span className="ve-sketch-line" />
        <span className="ve-sketch-button" />
      </div>
      <div className="ve-sketch-hero">
        {hasFonts && (
          <>
            <p className="ve-sketch-title" style={{ fontFamily: `"${headingFamily}", serif` }}>
              {headingFamily}
            </p>
            <p className="ve-sketch-text" style={{ fontFamily: `"${bodyFamily}", sans-serif` }}>
              {bodyLine}
            </p>
          </>
        )}
        {!hasFonts && (
          <>
            <span className="ve-sketch-bar" data-size="title" />
            <span className="ve-sketch-bar" data-size="text" />
          </>
        )}
        <span className="ve-sketch-button" data-size="large" />
      </div>
      <div className="ve-sketch-cards">
        <div className="ve-sketch-card" />
        <div className="ve-sketch-card" />
        <div className="ve-sketch-card" />
      </div>
    </div>
  );
}

function PagePreview({
  site,
  changedPage,
}: {
  site: Project;
  changedPage: string | null;
}): JSX.Element {
  const [wantedSlug, setWantedSlug] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const paintedSlugRef = useRef<string | null>(null);
  const followingRef = useRef<Following>('site');
  const swappedAtRef = useRef(0);
  const isMotionAllowed = useMediaQuery(MOTION_QUERY);

  const pages = pagesOf(site);
  let shown: PreviewPage | null = null;
  for (const page of pages) {
    const isWanted = page.slug === wantedSlug;
    const isHome = page.id === site.pages.homePageId;
    if (isWanted || (isHome && shown === null)) shown = page;
  }
  const shownId = shown?.id ?? null;
  const shownSlug = shown?.slug ?? null;

  useEffect(() => {
    if (changedPage === null || changedPage === shownSlug) return undefined;
    const sinceSwapMs = Date.now() - swappedAtRef.current;
    const timer = window.setTimeout(
      () => {
        if (followingRef.current !== 'site') return;
        swappedAtRef.current = Date.now();
        setWantedSlug(changedPage);
      },
      Math.max(0, PAGE_STAY_MS - sinceSwapMs),
    );
    return () => {
      window.clearTimeout(timer);
    };
  }, [changedPage, shownSlug]);

  useEffect(() => {
    const doc = frameRef.current?.contentDocument ?? null;
    if (!isLoaded || doc === null || shownId === null) return;
    const changes = showPage(doc, site, shownId);
    const paintedSlug = paintedSlugRef.current;
    paintedSlugRef.current = shownSlug;
    const isOtherPage = paintedSlug !== null && paintedSlug !== shownSlug;
    if (isOtherPage) {
      doc.defaultView?.scrollTo(0, 0);
      if (isMotionAllowed) doc.body.animate(PAGE_IN, { duration: PAGE_IN_MS, easing: 'ease-out' });
      return;
    }

    const newest = changes.sections[0] ?? changes.pictures[0];
    const isFollowing = followingRef.current !== 'nothing';
    if (newest !== undefined && isFollowing) glideTo(newest, isMotionAllowed);
    if (!isMotionAllowed) return;
    for (const [index, section] of changes.sections.entries()) {
      section.animate(SECTION_IN, {
        duration: SECTION_IN_MS,
        delay: index * SECTION_GAP_MS,
        easing: 'ease-out',
        fill: 'backwards',
      });
    }
    for (const picture of changes.pictures) {
      picture.animate(PICTURE_IN, { duration: PICTURE_IN_MS, easing: 'ease-out' });
    }
  }, [isLoaded, site, shownId, shownSlug, isMotionAllowed]);

  function handleLoad(event: SyntheticEvent<HTMLIFrameElement>): void {
    const doc = event.currentTarget.contentDocument;
    if (doc === null) return;
    doc.body.inert = true;
    for (const type of USER_SCROLL_EVENTS) {
      doc.addEventListener(
        type,
        () => {
          followingRef.current = 'nothing';
        },
        { passive: true },
      );
    }
    setIsLoaded(true);
  }

  function pickPage(slug: string): void {
    followingRef.current = 'page';
    setWantedSlug(slug);
  }

  const pageOptions = pages.map((page) => ({ value: page.slug, label: page.name }));

  return (
    <div className="ve-site-preview">
      {pages.length > 1 && shownSlug !== null && (
        <SegmentedControl
          legend="Page shown in the preview"
          isLegendHidden
          name="ve-site-preview-page"
          className="ve-site-preview-pages"
          options={pageOptions}
          value={shownSlug}
          onChange={pickPage}
        />
      )}
      <iframe
        ref={frameRef}
        className="ve-site-preview-frame"
        title="Preview of your site"
        tabIndex={-1}
        aria-hidden="true"
        srcDoc={FRAME_DOCUMENT}
        onLoad={handleLoad}
      />
    </div>
  );
}

export function SitePreview({ look, site, changedPage }: SitePreviewProps): JSX.Element {
  if (site === null) return <LookSketch look={look} />;
  return <PagePreview site={site} changedPage={changedPage} />;
}
