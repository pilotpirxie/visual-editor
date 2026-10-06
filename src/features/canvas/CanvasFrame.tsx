import { useLayoutEffect, useMemo, useState, type JSX, type SyntheticEvent } from 'react';
import { createPortal } from 'react-dom';
import { behaviors, core } from 'virtual:site-runtime';
import { selectCurrentPage, store, useStore } from '../../app/store';
import { registry } from '../../components/registry';
import { CANVAS_BASE_CSS, buildTokensCss } from '../../render/css';
import { BlockHost } from './BlockHost';
import { blockRoot } from './frameDom';
import { isOutOfView } from './geometry';
import { createScrollAnchor } from './scrollAnchor';

const SRC_DOC = [
  '<!doctype html>',
  '<html>',
  '<head>',
  '<meta charset="utf-8">',
  '<meta name="viewport" content="width=device-width, initial-scale=1">',
  '<style id="ve-base"></style>',
  '<style id="ve-tokens"></style>',
  '</head>',
  '<body><main id="ve-page"></main></body>',
  '</html>',
].join('');

const EDITOR_CSS = 'html { overflow-anchor: none; }';

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

export function CanvasFrame({ width, height, scale, onReady }: CanvasFrameProps): JSX.Element {
  const [doc, setDoc] = useState<Document | null>(null);
  const page = useStore(selectCurrentPage);
  const blocks = useStore((state) => state.project.blocks.entities);
  const tokens = useStore((state) => state.project.designSystem.tokens);
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
    const tokensStyle = doc.getElementById('ve-tokens');
    if (tokensStyle === null) return;
    anchor.capture();
    tokensStyle.textContent = buildTokensCss(tokens);
  }, [doc, anchor, tokens]);

  useLayoutEffect(() => {
    if (doc === null) return;
    for (const blockId of page.blockIds) {
      const block = blocks[blockId];
      if (block === undefined) continue;
      const component = registry.get(block.componentId);
      if (component === undefined) continue;
      const styleSelector = `style[data-component-css="${CSS.escape(component.definition.id)}"]`;
      if (doc.head.querySelector(styleSelector) !== null) continue;
      const style = doc.createElement('style');
      style.dataset.componentCss = component.definition.id;
      style.textContent = component.styles;
      doc.head.append(style);
    }
  }, [doc, page, blocks]);

  const pageRoot = doc === null ? null : doc.getElementById('ve-page');

  return (
    <>
      <iframe
        title="Page canvas"
        className="ve-canvas-frame"
        srcDoc={SRC_DOC}
        onLoad={handleLoad}
        style={{ width, height, transform: `scale(${scale})` }}
      />
      {doc !== null &&
        pageRoot !== null &&
        createPortal(
          page.blockIds.map((blockId) => (
            <BlockHost key={blockId} blockId={blockId} doc={doc} anchor={anchor} />
          )),
          pageRoot,
        )}
    </>
  );
}
