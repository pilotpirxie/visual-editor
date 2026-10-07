import Handlebars from 'handlebars/runtime';
import { memo, useLayoutEffect, useMemo, useRef, type JSX } from 'react';
import { selectCanvasRenderContext, selectComponents, useStore } from '../../app/store';
import type { Block, HtmlBlock } from '../../app/types';
import type { CustomDefinition, RegisteredComponent } from '../../components/types';
import { customComponentProblems } from '../block-packs/customComponents';
import { renderBlock, renderHtmlBlock, type RenderContext } from '../../render/renderBlock';
import { morphChildren } from './morph';
import type { ScrollAnchor } from './scrollAnchor';

type BlockHostProps = {
  blockId: string;
  doc: Document;
  anchor: ScrollAnchor;
};

const NOTICE_STYLE = [
  'padding: 6px 16px',
  'font: 12px/1.5 system-ui, sans-serif',
  'color: #4b5563',
  'background: repeating-linear-gradient(-45deg, #f3f4f6 0 8px, #e5e7eb 8px 16px)',
  'border-block: 1px dashed #d1d5db',
].join('; ');

function notice(blockId: string, text: string): string {
  const escape = Handlebars.escapeExpression;
  return `<div data-block-id="${escape(blockId)}" style="${NOTICE_STYLE}">${escape(text)}</div>`;
}

function renderHtmlForCanvas(block: HtmlBlock, ctx: RenderContext): string {
  if (block.disabled) return notice(block.id, 'Disabled: HTML block');
  try {
    return renderHtmlBlock(block, ctx);
  } catch (error) {
    console.error(`Canvas: HTML block ${block.id} failed to render`, error);
    return notice(block.id, 'This HTML block could not be shown');
  }
}

function unavailableNotice(
  blockId: string,
  componentId: string,
  custom: CustomDefinition | undefined,
): string {
  if (custom === undefined) {
    console.error(`Canvas: block ${blockId} uses unknown component "${componentId}"`);
    return notice(blockId, `Missing component: ${componentId}`);
  }
  if (customComponentProblems(custom) !== undefined) {
    return notice(
      blockId,
      `This custom block is not valid and can’t be shown: ${custom.definition.name}`,
    );
  }
  return notice(blockId, `Loading custom block: ${custom.definition.name}`);
}

function renderForCanvas(
  block: Block | undefined,
  ctx: RenderContext,
  components: ReadonlyMap<string, RegisteredComponent>,
  customDefinitions: Record<string, CustomDefinition>,
): string {
  if (block === undefined) return '';
  if (block.kind === 'html') return renderHtmlForCanvas(block, ctx);
  const component = components.get(block.componentId);
  if (component === undefined) {
    return unavailableNotice(block.id, block.componentId, customDefinitions[block.componentId]);
  }
  if (block.disabled) return notice(block.id, `Disabled: ${component.definition.name}`);
  try {
    return renderBlock(block, component, ctx);
  } catch (error) {
    console.error(`Canvas: block ${block.id} (${block.componentId}) failed to render`, error);
    return notice(block.id, `This block could not be shown: ${component.definition.name}`);
  }
}

export const BlockHost = memo(function BlockHost({
  blockId,
  doc,
  anchor,
}: BlockHostProps): JSX.Element {
  const block = useStore((state) => state.project.blocks.entities[blockId]);
  const ctx = useStore(selectCanvasRenderContext);
  const components = useStore(selectComponents);
  const customDefinitions = useStore((state) => state.project.customDefinitions);
  const html = useMemo(
    () => renderForCanvas(block, ctx, components, customDefinitions),
    [block, ctx, components, customDefinitions],
  );
  const hostRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const host = hostRef.current;
    if (host === null) return;
    anchor.capture();
    morphChildren(host, html);
    const runtime = doc.defaultView?.siteRuntime;
    if (runtime === undefined) {
      console.error('Canvas: the site runtime is not loaded in the canvas iframe');
      return;
    }
    return runtime.attach(host);
  }, [html, doc, anchor]);

  return <div ref={hostRef} data-block-host="" style={{ display: 'contents' }} />;
});
