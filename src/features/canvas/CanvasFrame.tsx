import { useLayoutEffect, useMemo, useState, type JSX, type SyntheticEvent } from 'react';
import { createPortal } from 'react-dom';
import { behaviors, core } from 'virtual:site-runtime';
import { selectCurrentPage, store, useStore } from '../../app/store';
import { registry } from '../../components/registry';
import { CANVAS_BASE_CSS, buildTokensCss } from '../../render/css';
import { BlockHost } from './BlockHost';
import { blockRoot } from './frameDom';
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
  if (!view) return null;
  const selectedId = store.getState().editor.selectedBlockId;
  const selected = selectedId ? blockRoot(doc, selectedId) : null;
  const selectedBox = selected?.getBoundingClientRect();
  if (selected && selectedBox && selectedBox.bottom > 0 && selectedBox.top < view.innerHeight) {
    return selected;
  }
  return (
    [...doc.querySelectorAll('[data-block-id]')].find(
      (element) => element.getBoundingClientRect().bottom > 0,
    ) ?? null
  );
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
        () => (doc ? findScrollAnchor(doc) : null),
      ),
    [doc],
  );

  const handleLoad = (event: SyntheticEvent<HTMLIFrameElement>) => {
    const iframe = event.currentTarget;
    const frameDoc = iframe.contentDocument;
    const baseStyle = frameDoc?.getElementById('ve-base');
    if (!frameDoc || !baseStyle) {
      console.error('Canvas iframe loaded without its page skeleton');
      return;
    }
    baseStyle.textContent = `${CANVAS_BASE_CSS}\n\n${EDITOR_CSS}`;
    const script = frameDoc.createElement('script');
    script.textContent = [core, ...Object.values(behaviors)].join('\n');
    frameDoc.head.append(script);
    setDoc(frameDoc);
    onReady({ iframe, doc: frameDoc });
  };

  useLayoutEffect(() => {
    doc?.documentElement.setAttribute('lang', language);
  }, [doc, language]);

  useLayoutEffect(() => {
    const tokensStyle = doc?.getElementById('ve-tokens');
    if (!tokensStyle) return;
    anchor.capture();
    tokensStyle.textContent = buildTokensCss(tokens);
  }, [doc, anchor, tokens]);

  useLayoutEffect(() => {
    if (!doc) return;
    for (const blockId of page.blockIds) {
      const componentId = blocks[blockId]?.componentId;
      const component = componentId ? registry.get(componentId) : undefined;
      if (
        !component ||
        doc.head.querySelector(`style[data-component-css="${CSS.escape(component.definition.id)}"]`)
      ) {
        continue;
      }
      const style = doc.createElement('style');
      style.dataset.componentCss = component.definition.id;
      style.textContent = component.styles;
      doc.head.append(style);
    }
  }, [doc, page, blocks]);

  const pageRoot = doc?.getElementById('ve-page');

  return (
    <>
      <iframe
        title="Page canvas"
        className="ve-canvas-frame"
        srcDoc={SRC_DOC}
        onLoad={handleLoad}
        style={{ width, height, transform: `scale(${scale})` }}
      />
      {doc &&
        pageRoot &&
        createPortal(
          page.blockIds.map((blockId) => (
            <BlockHost key={blockId} blockId={blockId} doc={doc} anchor={anchor} />
          )),
          pageRoot,
        )}
    </>
  );
}
