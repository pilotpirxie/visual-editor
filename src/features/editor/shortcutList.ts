export const SHORTCUT_KEYS = {
  undo: 'Mod+Z',
  redo: 'Shift+Mod+Z',
  redoAlternative: 'Mod+Y',
  duplicate: 'Mod+D',
  cut: 'Mod+X',
  copy: 'Mod+C',
  paste: 'Mod+V',
  remove: 'Delete',
  removeAlternative: 'Backspace',
  moveUp: 'Alt+↑',
  moveDown: 'Alt+↓',
  selectPrevious: '↑',
  selectNext: '↓',
  clearSelection: 'Escape',
  preview: 'Mod+P',
  open: 'Mod+O',
  save: 'Mod+S',
  saveAs: 'Shift+Mod+S',
  palette: 'Mod+K',
  help: '?',
} as const;

export type ShortcutName = keyof typeof SHORTCUT_KEYS;

export type HelpShortcut = { label: string; names: ShortcutName[] };

export type HelpGroup = { title: string; shortcuts: HelpShortcut[] };

export const HELP_GROUPS: HelpGroup[] = [
  {
    title: 'Blocks',
    shortcuts: [
      { label: 'Undo', names: ['undo'] },
      { label: 'Redo', names: ['redo', 'redoAlternative'] },
      { label: 'Duplicate the selected block', names: ['duplicate'] },
      { label: 'Copy, cut or paste a block', names: ['copy', 'cut', 'paste'] },
      { label: 'Delete the selected block', names: ['remove', 'removeAlternative'] },
      { label: 'Move the selected block up or down', names: ['moveUp', 'moveDown'] },
    ],
  },
  {
    title: 'Moving around',
    shortcuts: [
      {
        label: 'Select the previous or next block on the canvas',
        names: ['selectPrevious', 'selectNext'],
      },
      { label: 'Clear the selection or leave Preview', names: ['clearSelection'] },
      { label: 'Turn Preview on or off', names: ['preview'] },
      { label: 'Open the command palette', names: ['palette'] },
      { label: 'Open this help', names: ['help'] },
    ],
  },
  {
    title: 'Files',
    shortcuts: [
      { label: 'Open a project file', names: ['open'] },
      { label: 'Save to disk', names: ['save'] },
      { label: 'Save as a new file', names: ['saveAs'] },
    ],
  },
];
