import { findBlockList } from '../../app/blockLists';
import { conversionRequested } from '../../app/editorSlice';
import { blockDisabledSet } from '../../app/projectSlice';
import { dispatch, useStore } from '../../app/store';
import { duplicateBlock, moveBlockBy, removeBlock } from './blockActions';
import { copyBlockFromMenu, cutBlockFromMenu, pasteFromMenu } from './clipboard';
import type { MenuItem } from './Menu';

export type BlockMenuContext = {
  blockId: string;
  index: number;
  count: number;
  isDisabled: boolean;
  hasClipboard: boolean;
  canConvert: boolean;
};

export const PASTE_HINT = 'Copy a block first, or press ⌘V / Ctrl+V to paste from another tab';

function pasteAfterSelection(): void {
  dispatch(pasteFromMenu()).catch((error: unknown) => {
    console.error('Pasting a block from the menu failed', error);
  });
}

export function clipboardItems(blockId: string | null, hasClipboard: boolean): MenuItem[] {
  return [
    {
      id: 'cut',
      label: 'Cut',
      shortcut: 'Mod+X',
      disabled: blockId === null,
      onSelect: () => {
        if (blockId !== null) dispatch(cutBlockFromMenu(blockId));
      },
    },
    {
      id: 'copy',
      label: 'Copy',
      shortcut: 'Mod+C',
      disabled: blockId === null,
      onSelect: () => {
        if (blockId !== null) dispatch(copyBlockFromMenu(blockId));
      },
    },
    {
      id: 'paste',
      label: blockId === null ? 'Paste' : 'Paste after',
      shortcut: 'Mod+V',
      disabled: !hasClipboard,
      hint: hasClipboard ? undefined : PASTE_HINT,
      onSelect: pasteAfterSelection,
    },
  ];
}

export function blockMenuItems(context: BlockMenuContext): MenuItem[] {
  const { blockId, index, count, isDisabled, hasClipboard, canConvert } = context;
  return [
    {
      id: 'duplicate',
      label: 'Duplicate',
      shortcut: 'Mod+D',
      onSelect: () => dispatch(duplicateBlock(blockId)),
    },
    { id: 'clipboard-separator', isSeparator: true },
    ...clipboardItems(blockId, hasClipboard),
    { id: 'move-separator', isSeparator: true },
    {
      id: 'move-up',
      label: 'Move up',
      shortcut: 'Alt+↑',
      disabled: index <= 0,
      onSelect: () => dispatch(moveBlockBy(blockId, -1)),
    },
    {
      id: 'move-down',
      label: 'Move down',
      shortcut: 'Alt+↓',
      disabled: index === -1 || index >= count - 1,
      onSelect: () => dispatch(moveBlockBy(blockId, 1)),
    },
    {
      id: 'disable',
      label: isDisabled ? 'Enable' : 'Disable',
      onSelect: () => dispatch(blockDisabledSet({ blockId, disabled: !isDisabled })),
    },
    {
      id: 'convert',
      label: 'Convert to HTML…',
      disabled: !canConvert,
      hint: canConvert ? undefined : 'This block is already HTML',
      onSelect: () => dispatch(conversionRequested(blockId)),
    },
    { id: 'delete-separator', isSeparator: true },
    {
      id: 'delete',
      label: 'Delete',
      shortcut: 'Delete',
      isDanger: true,
      onSelect: () => dispatch(removeBlock(blockId)),
    },
  ];
}

export function useBlockMenuItems(blockId: string): MenuItem[] {
  const isDisabled = useStore((state) => state.project.blocks.entities[blockId]?.disabled ?? false);
  const list = useStore((state) => findBlockList(state.project, blockId));
  const hasClipboard = useStore((state) => state.editor.clipboardText !== null);
  const canConvert = useStore(
    (state) => state.project.blocks.entities[blockId]?.kind === 'component',
  );
  const index = list === null ? -1 : list.indexOf(blockId);
  const count = list === null ? 0 : list.length;
  return blockMenuItems({ blockId, index, count, isDisabled, hasClipboard, canConvert });
}
