import {
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type JSX,
  type PointerEvent,
} from 'react';
import { dispatch, useStore } from '../../app/store';
import { isBuiltIn } from '../../components/packFormat';
import type { BlockPack, LibraryEntry } from '../../components/types';
import { CATEGORIES } from '../../components/types';
import { packCommands } from '../block-packs/packCommands';
import { libraryEntries } from '../block-packs/packLibrary';
import { dragController } from '../canvas/dragController';
import { insertComponent } from '../editor/blockActions';
import { SavedBlockCard } from '../saved-blocks/SavedBlockCard';
import type { SavedBlockRecord } from '../../persistence/db';
import { filterComponents, matchesWords, searchWords } from './search';
import { Button, IconButton, SearchInput, Title, useTooltip } from '../../../packages/ui/src';

const THUMBNAIL_WIDTH = 640;
const THUMBNAIL_HEIGHT = 400;

type CategoryGroup = { id: string; label: string; components: LibraryEntry[] };

const PACK_GROUP_PREFIX = 'pack:';
const SAVED_GROUP_ID = 'saved';

export function groupByCategory(components: LibraryEntry[]): CategoryGroup[] {
  const groups: CategoryGroup[] = [];
  for (const { id, label } of CATEGORIES) {
    const inCategory = components.filter(({ definition }) => definition.category === id);
    if (inCategory.length > 0) groups.push({ id, label, components: inCategory });
  }
  return groups;
}

function groupByPack(packs: readonly BlockPack[]): CategoryGroup[] {
  const groups: CategoryGroup[] = [];
  for (const pack of packs) {
    groups.push({
      id: `${PACK_GROUP_PREFIX}${pack.id}`,
      label: pack.name,
      components: pack.blocks,
    });
  }
  return groups;
}

function hasFiles(event: DragEvent): boolean {
  return event.dataTransfer.types.includes('Files');
}

function loadDroppedPack(event: DragEvent): void {
  if (!hasFiles(event)) return;
  event.preventDefault();
  const file = event.dataTransfer.files[0];
  if (file !== undefined) packCommands.loadFile(file);
}

function allowFileDrop(event: DragEvent): void {
  if (!hasFiles(event)) return;
  event.preventDefault();
  event.dataTransfer.dropEffect = 'copy';
}

function ComponentCard({ component }: { component: LibraryEntry }): JSX.Element {
  const { definition, thumbnail, pack } = component;
  const { triggerProps, tooltip } = useTooltip({
    text:
      definition.description === undefined
        ? definition.name
        : `${definition.name}: ${definition.description}`,
    isDescription: true,
  });

  function startDrag(event: PointerEvent<HTMLButtonElement>): void {
    if (event.pointerType === 'touch') return;
    dragController.start(
      { kind: 'new', componentId: definition.id, label: definition.name },
      event,
    );
  }

  return (
    <li>
      <button
        type="button"
        className="ve-component-card"
        {...triggerProps}
        onClick={() => dispatch(insertComponent(definition.id))}
        onPointerDown={(event) => {
          triggerProps.onPointerDown();
          startDrag(event);
        }}
      >
        <img
          src={thumbnail}
          alt=""
          width={THUMBNAIL_WIDTH}
          height={THUMBNAIL_HEIGHT}
          loading="lazy"
          decoding="async"
          draggable={false}
        />
        <span className="ve-component-name">
          {definition.name}
          {!isBuiltIn(pack) && (
            <>
              {' '}
              <span className="ve-custom-badge">Custom</span>
            </>
          )}
        </span>
      </button>
      {tooltip}
    </li>
  );
}

function SavedBlockGrid({ records }: { records: SavedBlockRecord[] }): JSX.Element {
  return (
    <ul className="ve-component-grid">
      {records.map((record) => (
        <SavedBlockCard key={record.id} record={record} />
      ))}
    </ul>
  );
}

function filterSavedBlocks(records: SavedBlockRecord[], query: string): SavedBlockRecord[] {
  const words = searchWords(query);
  const matches: SavedBlockRecord[] = [];
  for (const record of records) {
    if (matchesWords(record.name, words)) matches.push(record);
  }
  return matches;
}

function ComponentGrid({ components }: { components: LibraryEntry[] }): JSX.Element {
  return (
    <ul className="ve-component-grid">
      {components.map((component) => (
        <ComponentCard key={component.definition.id} component={component} />
      ))}
    </ul>
  );
}

type GroupLink = { id: string; label: string; count: number };

function GroupHeader({ link, onBack }: { link: GroupLink; onBack(): void }): JSX.Element {
  return (
    <div className="ve-blocks-back">
      <IconButton label="All categories" icon="chevron-left" onClick={onBack} />
      <Title className="ve-blocks-heading">{link.label}</Title>
      <span className="ve-count">{link.count}</span>
    </div>
  );
}

function scrollPanelOf(element: HTMLElement | null): HTMLElement | null {
  return element?.closest<HTMLElement>('.ui-tab-panel') ?? null;
}

function groupLinks(groups: CategoryGroup[]): GroupLink[] {
  return groups.map(({ id, label, components }) => ({ id, label, count: components.length }));
}

function CategoryList({
  groups,
  onOpen,
}: {
  groups: GroupLink[];
  onOpen(id: string): void;
}): JSX.Element {
  return (
    <ul className="ve-categories">
      {groups.map(({ id, label, count }) => (
        <li key={id}>
          <button type="button" onClick={() => onOpen(id)}>
            {label}
            <span className="ve-count">{count}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

type SearchResultsProps = {
  query: string;
  entries: LibraryEntry[];
  savedBlocks: SavedBlockRecord[];
};

function SearchResults({ query, entries, savedBlocks }: SearchResultsProps): JSX.Element {
  const results = filterComponents(entries, query);
  const savedResults = filterSavedBlocks(savedBlocks, query);
  const hasResults = results.length > 0 || savedResults.length > 0;
  return (
    <>
      {savedResults.length > 0 && <SavedBlockGrid records={savedResults} />}
      {results.length > 0 && <ComponentGrid components={results} />}
      {!hasResults && <p className="ui-muted">No blocks match “{query.trim()}”.</p>}
    </>
  );
}

type GroupListProps = {
  myBlockLinks: GroupLink[];
  categoryLinks: GroupLink[];
  onOpen(id: string): void;
};

function GroupList({ myBlockLinks, categoryLinks, onOpen }: GroupListProps): JSX.Element {
  return (
    <>
      {myBlockLinks.length > 0 && (
        <section className="ve-my-blocks" aria-label="My blocks">
          <Title className="ve-blocks-heading">My blocks</Title>
          <CategoryList groups={myBlockLinks} onOpen={onOpen} />
        </section>
      )}
      <CategoryList groups={categoryLinks} onOpen={onOpen} />
      <div className="ve-pack-buttons">
        <Button variant="ghost" icon="upload" onClick={packCommands.loadFromDisk}>
          Load block pack
        </Button>
        <Button variant="ghost" onClick={packCommands.manage}>
          Manage packs
        </Button>
      </div>
    </>
  );
}

function myBlockLinksOf(packGroups: CategoryGroup[], savedCount: number): GroupLink[] {
  const links = groupLinks(packGroups);
  if (savedCount > 0)
    links.unshift({ id: SAVED_GROUP_ID, label: 'Saved blocks', count: savedCount });
  return links;
}

export function BlocksTab(): JSX.Element {
  const [query, setQuery] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const listScrollTop = useRef(0);
  const packs = useStore((state) => state.editor.blockPacks);
  const savedBlocks = useStore((state) => state.editor.savedBlocks);
  const entries = useMemo(() => libraryEntries(packs), [packs]);
  const categoryGroups = useMemo(() => groupByCategory(entries), [entries]);
  const packGroups = useMemo(() => groupByPack(packs), [packs]);
  const isSearching = query.trim() !== '';
  const isSavedOpen = categoryId === SAVED_GROUP_ID && savedBlocks.length > 0;
  const category = [...packGroups, ...categoryGroups].find(({ id }) => id === categoryId);
  const isListShown = !isSearching && category === undefined && !isSavedOpen;
  const isSavedShown = !isSearching && isSavedOpen;
  const shownCategory = isSearching ? undefined : category;

  useLayoutEffect(() => {
    const panel = scrollPanelOf(rootRef.current);
    if (panel === null) return;
    panel.scrollTop = isListShown ? listScrollTop.current : 0;
  }, [isListShown, categoryId]);

  function openGroup(id: string): void {
    listScrollTop.current = scrollPanelOf(rootRef.current)?.scrollTop ?? 0;
    setCategoryId(id);
  }

  function closeGroup(): void {
    setCategoryId(null);
  }

  return (
    <div ref={rootRef} className="ve-blocks" onDragOver={allowFileDrop} onDrop={loadDroppedPack}>
      <div className="ve-blocks-head">
        <SearchInput
          className="ve-blocks-search"
          label="Search blocks"
          value={query}
          onQuery={setQuery}
        />
        {isSavedShown && (
          <GroupHeader
            link={{ id: SAVED_GROUP_ID, label: 'Saved blocks', count: savedBlocks.length }}
            onBack={closeGroup}
          />
        )}
        {shownCategory !== undefined && (
          <GroupHeader
            link={{
              id: shownCategory.id,
              label: shownCategory.label,
              count: shownCategory.components.length,
            }}
            onBack={closeGroup}
          />
        )}
      </div>

      {isSearching && <SearchResults query={query} entries={entries} savedBlocks={savedBlocks} />}
      {isSavedShown && <SavedBlockGrid records={savedBlocks} />}
      {shownCategory !== undefined && <ComponentGrid components={shownCategory.components} />}
      {isListShown && (
        <GroupList
          myBlockLinks={myBlockLinksOf(packGroups, savedBlocks.length)}
          categoryLinks={groupLinks(categoryGroups)}
          onOpen={openGroup}
        />
      )}
    </div>
  );
}
