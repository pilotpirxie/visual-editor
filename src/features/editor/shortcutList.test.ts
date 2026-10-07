import { describe, expect, it } from 'vitest';
import { SHORTCUT_KEYS, type ShortcutName } from './shortcutList';
import { shortcutFor, type Shortcut, type ShortcutKeyEvent } from './useShortcuts';

const KEY_NAMES: Record<string, string> = { '↑': 'ArrowUp', '↓': 'ArrowDown' };
const SINGLE_LETTER = /^[A-Z]$/;

function eventFor(keys: string): ShortcutKeyEvent {
  const parts = keys.split('+');
  const key = parts.at(-1) ?? '';
  return {
    key: KEY_NAMES[key] ?? (SINGLE_LETTER.test(key) ? key.toLowerCase() : key),
    metaKey: parts.includes('Mod'),
    ctrlKey: false,
    altKey: parts.includes('Alt'),
    shiftKey: parts.includes('Shift') || key === '?',
    isComposing: false,
    defaultPrevented: false,
    target: document.body,
  };
}

type HandledShortcut = { name: ShortcutName; kind: Shortcut['kind'] };

const HANDLED: HandledShortcut[] = [
  { name: 'undo', kind: 'undo' },
  { name: 'redo', kind: 'redo' },
  { name: 'redoAlternative', kind: 'redo' },
  { name: 'duplicate', kind: 'duplicate' },
  { name: 'remove', kind: 'remove' },
  { name: 'removeAlternative', kind: 'remove' },
  { name: 'moveUp', kind: 'move' },
  { name: 'moveDown', kind: 'move' },
  { name: 'selectPrevious', kind: 'select-sibling' },
  { name: 'selectNext', kind: 'select-sibling' },
  { name: 'clearSelection', kind: 'clear-selection' },
  { name: 'preview', kind: 'toggle-preview' },
  { name: 'open', kind: 'open' },
  { name: 'save', kind: 'save' },
  { name: 'saveAs', kind: 'save' },
  { name: 'palette', kind: 'command-palette' },
  { name: 'help', kind: 'help' },
];

const CLIPBOARD_SHORTCUTS: ShortcutName[] = ['cut', 'copy', 'paste'];

describe('SHORTCUT_KEYS', () => {
  it.each(HANDLED)('$name is a key the editor handles', ({ name, kind }) => {
    expect(shortcutFor(eventFor(SHORTCUT_KEYS[name]), true)?.kind).toBe(kind);
  });

  it('has a check for every listed shortcut; clipboard keys are native copy and paste events', () => {
    const covered = new Set<string>(CLIPBOARD_SHORTCUTS);
    for (const { name } of HANDLED) covered.add(name);
    expect(covered).toEqual(new Set(Object.keys(SHORTCUT_KEYS)));
  });
});
