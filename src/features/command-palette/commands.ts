import { deviceChanged, dialogOpened, type DeviceMode } from '../../app/editorSlice';
import type { AppThunk } from '../../app/store';
import type { Page } from '../../app/types';
import { CATEGORIES } from '../../components/types';
import type { SavedBlockRecord } from '../../persistence/db';
import type { LibraryEntry } from '../block-packs/packLibrary';
import { insertComponent } from '../editor/blockActions';
import { deviceOptionLabel } from '../editor/DeviceSelect';
import { searchWords } from '../library/search';
import { openPage } from '../pages/pageActions';
import { insertSavedBlock } from '../saved-blocks/savedBlockActions';

export type PaletteDialog = 'export' | 'find' | 'snapshots' | 'help';

export type PaletteAction =
  | { kind: 'insert-block'; componentId: string }
  | { kind: 'insert-saved-block'; record: SavedBlockRecord }
  | { kind: 'open-page'; pageId: string }
  | { kind: 'device'; mode: DeviceMode }
  | { kind: 'dialog'; dialog: PaletteDialog };

export type PaletteGroup = 'Blocks' | 'Saved blocks' | 'Pages' | 'Devices' | 'Site';

export type PaletteCommand = {
  id: string;
  group: PaletteGroup;
  label: string;
  keywords: string;
  action: PaletteAction;
};

export type PaletteSources = {
  entries: readonly LibraryEntry[];
  savedBlocks: readonly SavedBlockRecord[];
  pages: readonly Page[];
  isReadOnly: boolean;
};

export const MAX_PALETTE_RESULTS = 50;

const DEVICE_MODES: DeviceMode[] = ['responsive', 'desktop', 'tablet', 'phone'];

const SITE_COMMANDS: {
  dialog: PaletteDialog;
  label: string;
  keywords: string;
  isEditing: boolean;
}[] = [
  { dialog: 'export', label: 'Export site', keywords: 'download zip html', isEditing: false },
  { dialog: 'find', label: 'Find and replace', keywords: 'search text', isEditing: true },
  { dialog: 'snapshots', label: 'Snapshots', keywords: 'restore history version', isEditing: true },
  { dialog: 'help', label: 'Help and keyboard shortcuts', keywords: 'keys', isEditing: false },
];

function categoryLabel(categoryId: string): string {
  for (const category of CATEGORIES) {
    if (category.id === categoryId) return category.label;
  }
  return '';
}

function blockCommands(entries: readonly LibraryEntry[]): PaletteCommand[] {
  const commands: PaletteCommand[] = [];
  for (const { definition } of entries) {
    commands.push({
      id: `block:${definition.id}`,
      group: 'Blocks',
      label: `Insert ${definition.name}`,
      keywords: [categoryLabel(definition.category), ...(definition.tags ?? [])].join(' '),
      action: { kind: 'insert-block', componentId: definition.id },
    });
  }
  return commands;
}

function savedBlockCommands(records: readonly SavedBlockRecord[]): PaletteCommand[] {
  const commands: PaletteCommand[] = [];
  for (const record of records) {
    commands.push({
      id: `saved:${record.id}`,
      group: 'Saved blocks',
      label: `Insert ${record.name}`,
      keywords: 'saved',
      action: { kind: 'insert-saved-block', record },
    });
  }
  return commands;
}

function pageCommands(pages: readonly Page[]): PaletteCommand[] {
  const commands: PaletteCommand[] = [];
  for (const page of pages) {
    commands.push({
      id: `page:${page.id}`,
      group: 'Pages',
      label: `Go to ${page.name}`,
      keywords: `page ${page.slug}`,
      action: { kind: 'open-page', pageId: page.id },
    });
  }
  return commands;
}

function deviceCommands(): PaletteCommand[] {
  const commands: PaletteCommand[] = [];
  for (const mode of DEVICE_MODES) {
    commands.push({
      id: `device:${mode}`,
      group: 'Devices',
      label: `Show ${deviceOptionLabel(mode)}`,
      keywords: 'device width preview',
      action: { kind: 'device', mode },
    });
  }
  return commands;
}

function siteCommands(isReadOnly: boolean): PaletteCommand[] {
  const commands: PaletteCommand[] = [];
  for (const { dialog, label, keywords, isEditing } of SITE_COMMANDS) {
    if (isReadOnly && isEditing) continue;
    commands.push({
      id: `site:${dialog}`,
      group: 'Site',
      label,
      keywords,
      action: { kind: 'dialog', dialog },
    });
  }
  return commands;
}

export function buildPaletteCommands({
  entries,
  savedBlocks,
  pages,
  isReadOnly,
}: PaletteSources): PaletteCommand[] {
  const commands: PaletteCommand[] = [];
  if (!isReadOnly) commands.push(...blockCommands(entries), ...savedBlockCommands(savedBlocks));
  commands.push(...pageCommands(pages), ...deviceCommands(), ...siteCommands(isReadOnly));
  return commands;
}

export function filterPaletteCommands(
  commands: readonly PaletteCommand[],
  query: string,
): PaletteCommand[] {
  const words = searchWords(query);
  if (words.length === 0) return commands.slice(0, MAX_PALETTE_RESULTS);
  const prefixMatches: PaletteCommand[] = [];
  const otherMatches: PaletteCommand[] = [];
  for (const command of commands) {
    const label = command.label.toLowerCase();
    const text = `${label} ${command.group} ${command.keywords}`.toLowerCase();
    if (!words.every((word) => text.includes(word))) continue;
    const firstWord = words[0] ?? '';
    const isPrefixMatch = label.split(' ').some((part) => part.startsWith(firstWord));
    if (isPrefixMatch) {
      prefixMatches.push(command);
    } else {
      otherMatches.push(command);
    }
  }
  return [...prefixMatches, ...otherMatches].slice(0, MAX_PALETTE_RESULTS);
}

export function runPaletteAction(action: PaletteAction): AppThunk<Promise<void>> {
  return async (dispatch) => {
    if (action.kind === 'insert-block') {
      dispatch(insertComponent(action.componentId));
    } else if (action.kind === 'insert-saved-block') {
      await dispatch(insertSavedBlock(action.record));
    } else if (action.kind === 'open-page') {
      dispatch(openPage(action.pageId));
    } else if (action.kind === 'device') {
      dispatch(deviceChanged(action.mode));
    } else {
      dispatch(dialogOpened({ kind: action.dialog }));
    }
  };
}
