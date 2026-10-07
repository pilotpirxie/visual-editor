import { useId, useMemo, useState, type JSX, type KeyboardEvent } from 'react';
import { dialogClosed, noticeShown } from '../../app/editorSlice';
import { describeError } from '../../app/errors';
import { dispatch, useStore } from '../../app/store';
import type { Page } from '../../app/types';
import { registry } from '../../components/registry';
import { packEntries, type LibraryEntry } from '../block-packs/packLibrary';
import {
  buildPaletteCommands,
  filterPaletteCommands,
  runPaletteAction,
  type PaletteCommand,
  type PaletteGroup,
} from './commands';
import './commandPalette.css';
import { Dialog, SearchInput } from '../../../packages/ui/src';

const TITLE_ID = 've-palette-title';

const BUILT_IN_ENTRIES: LibraryEntry[] = [...registry.values()].map(
  ({ definition, thumbnail }) => ({ definition, thumbnail, pack: null }),
);

type CommandGroup = { group: PaletteGroup; commands: PaletteCommand[] };

function groupCommands(commands: readonly PaletteCommand[]): CommandGroup[] {
  const groups: CommandGroup[] = [];
  for (const command of commands) {
    const last = groups.at(-1);
    if (last !== undefined && last.group === command.group) {
      last.commands.push(command);
    } else {
      groups.push({ group: command.group, commands: [command] });
    }
  }
  return groups;
}

function usePaletteCommands(): PaletteCommand[] {
  const packs = useStore((state) => state.editor.blockPacks);
  const savedBlocks = useStore((state) => state.editor.savedBlocks);
  const pagesState = useStore((state) => state.project.pages);
  const isReadOnly = useStore((state) => state.editor.isReadOnly);
  return useMemo(() => {
    const pages: Page[] = [];
    for (const id of pagesState.ids) {
      const page = pagesState.entities[id];
      if (page !== undefined) pages.push(page);
    }
    const entries = [...BUILT_IN_ENTRIES, ...packEntries(packs)];
    return buildPaletteCommands({ entries, savedBlocks, pages, isReadOnly });
  }, [packs, savedBlocks, pagesState, isReadOnly]);
}

function run(command: PaletteCommand): void {
  dispatch(dialogClosed());
  dispatch(runPaletteAction(command.action)).catch((error: unknown) => {
    console.error(`The command "${command.label}" failed`, error);
    dispatch(noticeShown('error', `“${command.label}” failed: ${describeError(error)}`));
  });
}

export function CommandPalette({ onClose }: { onClose(): void }): JSX.Element {
  const listId = useId();
  const commands = usePaletteCommands();
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const results = useMemo(() => filterPaletteCommands(commands, query), [commands, query]);
  const groups = groupCommands(results);
  const active = results[Math.min(activeIndex, results.length - 1)];

  function optionId(command: PaletteCommand): string {
    return `${listId}-${command.id}`;
  }

  function moveActive(offset: number): void {
    if (results.length === 0) return;
    const current = Math.min(activeIndex, results.length - 1);
    const next = (current + offset + results.length) % results.length;
    setActiveIndex(next);
    const command = results[next];
    if (command === undefined) return;
    document.getElementById(optionId(command))?.scrollIntoView({ block: 'nearest' });
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>): void {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      moveActive(1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      moveActive(-1);
    } else if (event.key === 'Enter' && active !== undefined) {
      event.preventDefault();
      run(active);
    }
  }

  return (
    <Dialog labelId={TITLE_ID} className="ve-palette" onClose={onClose}>
      <div className="ui-dialog-body">
        <h2 id={TITLE_ID} className="ve-visually-hidden">
          Command palette
        </h2>
        <SearchInput
          label="Type a command"
          value={query}
          autoFocus
          role="combobox"
          aria-expanded="true"
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={active === undefined ? undefined : optionId(active)}
          onKeyDown={onKeyDown}
          onChange={(event) => {
            setQuery(event.currentTarget.value);
            setActiveIndex(0);
          }}
        />
        {results.length === 0 && (
          <p className="ui-muted" role="status">
            No commands match “{query.trim()}”.
          </p>
        )}
        <div id={listId} role="listbox" aria-label="Commands" className="ve-palette-list">
          {groups.map(({ group, commands: groupItems }) => (
            <div key={group} role="group" aria-labelledby={`${listId}-${group}`}>
              <div id={`${listId}-${group}`} className="ve-palette-group" role="presentation">
                {group}
              </div>
              {groupItems.map((command) => (
                <div
                  key={command.id}
                  id={optionId(command)}
                  role="option"
                  aria-selected={command === active}
                  className="ve-palette-option"
                  onPointerMove={() => setActiveIndex(results.indexOf(command))}
                  onClick={() => run(command)}
                >
                  {command.label}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </Dialog>
  );
}
