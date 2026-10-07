const IS_MAC = /Mac|iPhone|iPad/.test(globalThis.navigator?.platform ?? '');

const MAC_KEYS: Record<string, string> = { Mod: '⌘', Shift: '⇧', Alt: '⌥' };
const OTHER_KEYS: Record<string, string> = { Mod: 'Ctrl', Shift: 'Shift', Alt: 'Alt' };
const ARIA_KEYS: Record<string, string> = {
  Mod: IS_MAC ? 'Meta' : 'Control',
  '↑': 'ArrowUp',
  '↓': 'ArrowDown',
};

export function shortcutLabel(keys: string): string {
  const names = IS_MAC ? MAC_KEYS : OTHER_KEYS;
  const parts: string[] = [];
  for (const part of keys.split('+')) parts.push(names[part] ?? part);
  return parts.join(IS_MAC ? '' : '+');
}

export function ariaKeyShortcut(keys: string): string {
  const parts: string[] = [];
  for (const part of keys.split('+')) parts.push(ARIA_KEYS[part] ?? part);
  return parts.join('+');
}
