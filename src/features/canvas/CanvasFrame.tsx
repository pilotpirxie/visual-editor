import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type JSX,
  type ReactPortal,
  type SyntheticEvent,
} from 'react';
import { createPortal } from 'react-dom';
import { behaviors, core } from 'virtual:site-runtime';
import { pageAnchorRequested } from '../../app/editorSlice';
import { dispatch, selectCurrentPage, selectShownSlot, store, useStore } from '../../app/store';
import { blockComponentId, registry } from '../../components/registry';
import { CANVAS_BASE_CSS, buildTokensCss } from '../../render/css';
import { BlockHost } from './BlockHost';
import { syncFontLink } from './fontLink';
import { blockRoot } from './frameDom';
import { isOutOfView } from './geometry';
import { createScrollAnchor, type ScrollAnchor } from './scrollAnchor';

const SRC_DOC = [
  '<!doctype html>',
  '<html>',
  '<head>',
  '<meta charset="utf-8">',
  '<meta name="viewport" content="width=device-width, initial-scale=1">',
  '<style id="ve-base"></style>',
  '<style id="ve-tokens"></style>',
  '</head>',
  '<body><div id="ve-header"></div><main id="ve-page"></main><div id="ve-footer"></div></body>',
  '</html>',
].join('');

const EDITOR_CSS = [
  'html { overflow-anchor: none; }',
  '#ve-header, #ve-footer { display: contents; }',
  '#ve-page:empty { min-height: 100vh; }',
].join('\n');

export type CanvasFrameHandle = { iframe: HTMLIFrameElement; doc: Document };

type CanvasFrameProps = {
  width: number;
  height: number;
  scale: number;
  onReady: (frame: CanvasFrameHandle) => void;
};

function findScrollAnchor(doc: Document): Element | null {
  const view = doc.defaultView;
  if (view === null) return null;
  const selectedId = store.getState().editor.selectedBlockId;
  const selected = selectedId === null ? null : blockRoot(doc, selectedId);
  if (selected !== null && !isOutOfView(selected.getBoundingClientRect(), view.innerHeight)) {
    return selected;
  }
  for (const element of doc.querySelectorAll('[data-block-id]')) {
    if (element.getBoundingClientRect().bottom > 0) return element;
  }
  return null;
}

function usePageScrollMemory(doc: Document | null, pageId: string, anchor: ScrollAnchor): void {
  const scrollByPageRef = useRef(new Map<string, number>());
  const shownPageIdRef = useRef<string | null>(null);

  useEffect(() => {
    const view = doc?.defaultView;
    if (view === null || view === undefined) return;
    const scrolledView = view;
    function rememberScroll(): void {
      const shownPageId = shownPageIdRef.current;
      if (shownPageId !== null) scrollByPageRef.current.set(shownPageId, scrolledView.scrollY);
    }
    scrolledView.addEventListener('scroll', rememberScroll, { passive: true });
    return () => scrolledView.removeEventListener('scroll', rememberScroll);
  }, [doc]);

  useLayoutEffect(() => {
    const view = doc?.defaultView;
    if (doc === null || view === null || view === undefined) return;
    const previousPageId = shownPageIdRef.current;
    shownPageIdRef.current = pageId;
    if (previousPageId === null || previousPageId === pageId) return;
    anchor.cancel();
    const anchorId = store.getState().editor.pendingAnchor;
    if (anchorId !== null) dispatch(pageAnchorRequested(null));
    const target = anchorId === null ? null : doc.getElementById(anchorId);
    if (target !== null) {
      target.scrollIntoView({ block: 'start' });
      return;
    }
    view.scrollTo(0, scrollByPageRef.current.get(pageId) ?? 0);
  }, [doc, pageId, anchor]);
}

export function CanvasFrame({ width, height, scale, onReady }: CanvasFrameProps): JSX.Element {
  const [doc, setDoc] = useState<Document | null>(null);
  const page = useStore(selectCurrentPage);
  const headerBlockIds = useStore((state) => selectShownSlot(state, 'header'));
  const footerBlockIds = useStore((state) => selectShownSlot(state, 'footer'));
  const blocks = useStore((state) => state.project.blocks.entities);
  const tokens = useStore((state) => state.project.designSystem.tokens);
  const fonts = useStore((state) => state.project.designSystem.fonts);
  const language = useStore((state) => state.project.settings.language);

  const anchor = useMemo(
    () =>
      createScrollAnchor(
        () => doc?.defaultView ?? null,
        () => (doc === null ? null : findScrollAnchor(doc)),
      ),
    [doc],
  );

  function handleLoad(event: SyntheticEvent<HTMLIFrameElement>): void {
    const iframe = event.currentTarget;
    const frameDoc = iframe.contentDocument;
    const baseStyle = frameDoc === null ? null : frameDoc.getElementById('ve-base');
    if (frameDoc === null || baseStyle === null) {
      console.error('Canvas iframe loaded without its page skeleton');
      return;
    }
    baseStyle.textContent = `${CANVAS_BASE_CSS}\n\n${EDITOR_CSS}`;
    const script = frameDoc.createElement('script');
    script.textContent = [core, ...Object.values(behaviors)].join('\n');
    frameDoc.head.append(script);
    setDoc(frameDoc);
    onReady({ iframe, doc: frameDoc });
  }

  useLayoutEffect(() => {
    if (doc === null) return;
    doc.documentElement.setAttribute('lang', language);
  }, [doc, language]);

  useLayoutEffect(() => {
    if (doc === null) return;
    syncFontLink(doc, fonts);
  }, [doc, fonts]);

  useLayoutEffect(() => {
    if (doc === null) return;
    const tokensStyle = doc.getElementById('ve-tokens');
    if (tokensStyle === null) return;
    anchor.capture();
    tokensStyle.textContent = buildTokensCss(tokens);
  }, [doc, anchor, tokens]);

  useLayoutEffect(() => {
    if (doc === null) return;
    for (const blockId of [...headerBlockIds, ...page.blockIds, ...footerBlockIds]) {
      const block = blocks[blockId];
      const componentId = block === undefined ? null : blockComponentId(block);
      const component = componentId === null ? undefined : registry.get(componentId);
      if (component === undefined) continue;
      const styleSelector = `style[data-component-css="${CSS.escape(component.definition.id)}"]`;
      if (doc.head.querySelector(styleSelector) !== null) continue;
      const style = doc.createElement('style');
      style.dataset.componentCss = component.definition.id;
      style.textContent = component.styles;
      doc.head.append(style);
    }
  }, [doc, page, headerBlockIds, footerBlockIds, blocks]);

  usePageScrollMemory(doc, page.id, anchor);

  function renderInto(rootId: string, blockIds: string[]): ReactPortal | null {
    const root = doc === null ? null : doc.getElementById(rootId);
    if (doc === null || root === null) return null;
    return createPortal(
      blockIds.map((blockId) => (
        <BlockHost key={blockId} blockId={blockId} doc={doc} anchor={anchor} />
      )),
      root,
    );
  }

  return (
    <>
      <iframe
        title="Page canvas"
        className="ve-canvas-frame"
        srcDoc={SRC_DOC}
        onLoad={handleLoad}
        style={{ width, height, transform: `scale(${scale})` }}
      />
      {renderInto('ve-header', headerBlockIds)}
      {renderInto('ve-page', page.blockIds)}
      {renderInto('ve-footer', footerBlockIds)}
    </>
  );
}
