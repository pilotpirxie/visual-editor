import { clipboardTextStored, customComponentsLoaded, noticeShown } from '../../app/editorSlice';
import { blockPasted } from '../../app/projectSlice';
import type { AppThunk } from '../../app/store';
import type { Block, Project, Token } from '../../app/types';
import { mapFieldValues } from '../../components/fieldValues';
import { isButtonValue, isLinkValue } from '../../components/fields';
import { behaviors } from 'virtual:site-runtime';
import { parseEmbeddedDefinitions } from '../../components/packFormat';
import { blockCategory, blockComponentId, definitionOf } from '../../components/registry';
import type { CustomDefinition } from '../../components/types';
import { ensureCustomComponents } from '../block-packs/customComponents';
import { packInLibrary } from '../block-packs/packLibrary';
import type { LinkValue } from '../../components/types';
import { upgradeComponentBlock } from '../../persistence/migrations';
import { projectRegistry } from '../block-packs/customComponents';
import { isRecord, parseBlock } from '../../persistence/parseBlock';
import { referencedTokenName } from '../../render/css';
import { createRenderContext, renderAnyBlock } from '../../render/renderBlock';
import { isSafeCssValue } from '../../render/sanitize';
import { ensureIconSets, iconSetsUsedBy } from '../icons/ensureIconSets';
import { pasteLocation, removeBlock } from './blockActions';

export const BLOCK_CLIPBOARD_FORMAT = 'visual-editor/block';

const BLOCK_CLIPBOARD_VERSION = 1;

export type BlockEnvelope = {
  format: typeof BLOCK_CLIPBOARD_FORMAT;
  formatVersion: typeof BLOCK_CLIPBOARD_VERSION;
  sourceProjectId: string;
  block: Block;
  tokens: Record<string, string>;
  customDefinitions: Record<string, CustomDefinition>;
};

export type ClipboardPayload = { text: string; html: string };

export type PastePreparation = {
  block: Block;
  clearedLinkCount: number;
  custom: CustomDefinition | undefined;
};

export type ClipboardWriter = Pick<DataTransfer, 'setData'>;

function resolvedTokenValue(name: string, tokens: Record<string, Token>): string | null {
  const seen = new Set<string>();
  let current = name;
  while (!seen.has(current)) {
    seen.add(current);
    const token = tokens[current];
    if (token === undefined) return null;
    const next = referencedTokenName(token.value);
    if (next === null) return token.value;
    current = next;
  }
  return null;
}

function overrideTokens(block: Block, tokens: Record<string, Token>): Record<string, string> {
  const resolved: Record<string, string> = {};
  if (block.kind !== 'component') return resolved;
  for (const value of Object.values(block.overrides)) {
    const name = referencedTokenName(value);
    if (name === null) continue;
    const literal = resolvedTokenValue(name, tokens);
    if (literal !== null) resolved[name] = literal;
  }
  return resolved;
}

function definitionsUsedBy(block: Block, project: Project): Record<string, CustomDefinition> {
  const componentId = blockComponentId(block);
  const custom = componentId === null ? undefined : project.customDefinitions[componentId];
  return custom === undefined ? {} : { [custom.definition.id]: custom };
}

export function createEnvelope(project: Project, blockId: string): BlockEnvelope | null {
  const block = project.blocks.entities[blockId];
  if (block === undefined) return null;
  return {
    format: BLOCK_CLIPBOARD_FORMAT,
    formatVersion: BLOCK_CLIPBOARD_VERSION,
    sourceProjectId: project.id,
    block: structuredClone(block),
    tokens: overrideTokens(block, project.designSystem.tokens),
    customDefinitions: structuredClone(definitionsUsedBy(block, project)),
  };
}

export function envelopeHtml(project: Project, block: Block): string {
  try {
    const components = projectRegistry(project);
    return renderAnyBlock(block, components, createRenderContext(project, 'export')) ?? '';
  } catch (error) {
    console.warn(`Could not render block ${block.id} for the clipboard`, error);
    return '';
  }
}

function parseTokenValues(value: unknown): Record<string, string> {
  const tokens: Record<string, string> = {};
  if (!isRecord(value)) return tokens;
  for (const [name, tokenValue] of Object.entries(value)) {
    if (typeof tokenValue === 'string' && isSafeCssValue(tokenValue)) tokens[name] = tokenValue;
  }
  return tokens;
}

export function parseEnvelope(text: string): BlockEnvelope | null {
  if (!text.includes(BLOCK_CLIPBOARD_FORMAT)) return null;
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch (error) {
    console.warn('Clipboard text looked like a block but is not valid JSON', error);
    return null;
  }
  if (!isRecord(data) || data.format !== BLOCK_CLIPBOARD_FORMAT) return null;
  if (data.formatVersion !== BLOCK_CLIPBOARD_VERSION) return null;
  if (typeof data.sourceProjectId !== 'string') return null;
  const block = parseBlock(data.block);
  if (block === null) return null;
  return {
    format: BLOCK_CLIPBOARD_FORMAT,
    formatVersion: BLOCK_CLIPBOARD_VERSION,
    sourceProjectId: data.sourceProjectId,
    block,
    tokens: parseTokenValues(data.tokens),
    customDefinitions: parseEmbeddedDefinitions(data.customDefinitions, Object.keys(behaviors)),
  };
}

function pointsToMissingPage(link: LinkValue, pageIds: ReadonlySet<string>): boolean {
  const isPageLink = link.type === 'page' || link.type === 'section';
  return isPageLink && link.pageId !== undefined && !pageIds.has(link.pageId);
}

function clearedLink(link: LinkValue): LinkValue {
  return { type: 'url', url: '#', newTab: link.newTab };
}

export function prepareForPaste(
  envelope: BlockEnvelope,
  project: Project,
  newBlockId: string,
): PastePreparation | null {
  const componentId = blockComponentId(envelope.block);
  const incoming = componentId === null ? undefined : envelope.customDefinitions[componentId];
  const custom =
    componentId !== null && project.customDefinitions[componentId] === undefined
      ? incoming
      : undefined;
  if (envelope.block.kind === 'html') {
    return { block: { ...envelope.block, id: newBlockId }, clearedLinkCount: 0, custom };
  }
  const definition = definitionOf(project, envelope.block.componentId) ?? custom?.definition;
  if (definition === undefined) return null;
  const block = upgradeComponentBlock(envelope.block, definition);
  const pageIds = new Set(project.pages.ids);
  let clearedLinkCount = 0;
  const values = mapFieldValues(definition.fields, block.values, (field, value) => {
    if (field.type === 'link' && isLinkValue(value) && pointsToMissingPage(value, pageIds)) {
      clearedLinkCount += 1;
      return clearedLink(value);
    }
    const isButton = field.type === 'button' && isButtonValue(value);
    if (isButton && pointsToMissingPage(value.link, pageIds)) {
      clearedLinkCount += 1;
      return { ...value, link: clearedLink(value.link) };
    }
    return value;
  });
  const overrides: Record<string, string> = {};
  for (const [token, value] of Object.entries(block.overrides)) {
    const name = referencedTokenName(value);
    const isMissingToken = name !== null && project.designSystem.tokens[name] === undefined;
    if (!isMissingToken) {
      overrides[token] = value;
      continue;
    }
    const literal = envelope.tokens[name];
    if (literal !== undefined) overrides[token] = literal;
  }
  return { block: { ...block, id: newBlockId, values, overrides }, clearedLinkCount, custom };
}

export function blockClipboardPayload(project: Project, blockId: string): ClipboardPayload | null {
  const envelope = createEnvelope(project, blockId);
  if (envelope === null) return null;
  return { text: JSON.stringify(envelope), html: envelopeHtml(project, envelope.block) };
}

export function copyBlockTo(blockId: string, data: ClipboardWriter): AppThunk<boolean> {
  return (dispatch, getState) => {
    const payload = blockClipboardPayload(getState().project, blockId);
    if (payload === null) return false;
    data.setData('text/plain', payload.text);
    data.setData('text/html', payload.html);
    dispatch(clipboardTextStored(payload.text));
    return true;
  };
}

export function cutBlockTo(blockId: string, data: ClipboardWriter): AppThunk<boolean> {
  return (dispatch) => {
    const isCopied = dispatch(copyBlockTo(blockId, data));
    if (isCopied) dispatch(removeBlock(blockId));
    return isCopied;
  };
}

function clearedLinksNotice(count: number): string {
  if (count === 1) return 'A link pointed to a page this project does not have, so it was cleared.';
  return `${count} links pointed to pages this project does not have, so they were cleared.`;
}

export function pasteEnvelope(envelope: BlockEnvelope): AppThunk<Promise<void>> {
  return async (dispatch, getState) => {
    const prepared = prepareForPaste(envelope, getState().project, crypto.randomUUID());
    if (prepared === null) {
      dispatch(
        noticeShown('error', 'This block can’t be pasted: its component is not in the library.'),
      );
      return;
    }
    const { custom } = prepared;
    if (custom !== undefined) {
      const { hasCompiled, problems } = await ensureCustomComponents([custom]);
      if (hasCompiled) dispatch(customComponentsLoaded());
      if (problems.length > 0) {
        dispatch(
          noticeShown('error', 'This block can’t be pasted: its custom block is not valid.'),
        );
        return;
      }
    }
    const project = { ...getState().project };
    const withIncoming =
      custom === undefined
        ? project
        : {
            ...project,
            customDefinitions: { ...project.customDefinitions, [custom.definition.id]: custom },
          };
    await ensureIconSets(iconSetsUsedBy([prepared.block], withIncoming));
    const location = pasteLocation(getState(), blockCategory(prepared.block, withIncoming));
    dispatch(blockPasted({ ...location, block: prepared.block, custom }));
    const isPackMissing =
      custom !== undefined && packInLibrary(getState(), custom.pack.id) === undefined;
    if (isPackMissing) {
      dispatch(
        noticeShown(
          'info',
          `This block comes from “${custom.pack.name}”, which is not in your library. You can add it from Blocks › Manage packs.`,
        ),
      );
    }
    if (prepared.clearedLinkCount > 0) {
      dispatch(noticeShown('warning', clearedLinksNotice(prepared.clearedLinkCount)));
    }
  };
}

async function writeSystemClipboard(payload: ClipboardPayload): Promise<void> {
  const { clipboard } = navigator;
  if (clipboard === undefined) throw new Error('This browser has no clipboard API');
  if (typeof ClipboardItem === 'function' && typeof clipboard.write === 'function') {
    const item = new ClipboardItem({
      'text/plain': new Blob([payload.text], { type: 'text/plain' }),
      'text/html': new Blob([payload.html], { type: 'text/html' }),
    });
    await clipboard.write([item]);
    return;
  }
  await clipboard.writeText(payload.text);
}

export function copyBlockFromMenu(blockId: string): AppThunk<boolean> {
  return (dispatch, getState) => {
    const payload = blockClipboardPayload(getState().project, blockId);
    if (payload === null) return false;
    dispatch(clipboardTextStored(payload.text));
    writeSystemClipboard(payload).catch((error: unknown) => {
      console.warn('Could not write the block to the system clipboard', error);
      dispatch(
        noticeShown(
          'info',
          'Copied for this tab. To paste in another tab, select the block and copy it with the keyboard.',
        ),
      );
    });
    return true;
  };
}

export function cutBlockFromMenu(blockId: string): AppThunk {
  return (dispatch) => {
    if (dispatch(copyBlockFromMenu(blockId))) dispatch(removeBlock(blockId));
  };
}

export function pasteFromMenu(): AppThunk<Promise<void>> {
  return async (dispatch, getState) => {
    const text = getState().editor.clipboardText;
    const envelope = text === null ? null : parseEnvelope(text);
    if (envelope === null) return;
    await dispatch(pasteEnvelope(envelope));
  };
}
