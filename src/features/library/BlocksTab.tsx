import { useMemo, useState, type DragEvent, type JSX, type PointerEvent } from 'react';
import { dispatch, useStore } from '../../app/store';
import { registry } from '../../components/registry';
import type { BlockPack } from '../../components/types';
import { CATEGORIES } from '../../components/types';
import { packCommands } from '../block-packs/packCommands';
import { packEntries, type LibraryEntry } from '../block-packs/packLibrary';
import { dragController } from '../canvas/dragController';
import { insertComponent } from '../editor/blockActions';
import { SavedBlockCard } from '../saved-blocks/SavedBlockCard';
import type { SavedBlockRecord } from '../../persistence/db';
import { filterComponents, matchesWords, searchWords } from './search';
import { Button, Icon, SearchInput, Title, useTooltip } from '../../../packages/ui/src';

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
      components: packEntries([pack]),
    });
  }
  return groups;
}

const BUILT_IN_ENTRIES: LibraryEntry[] = [...registry.values()].map(
  ({ definition, thumbnail }) => ({
    definition,
    thumbnail,
    pack: null,
  }),
);

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
    text: definition.description ?? '',
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
        {thumbnail === '' ? (
          <span className="ve-thumbnail-placeholder" aria-hidden="true">
            <Icon name="layout-grid" />
          </span>
        ) : (
          <img
            src={thumbnail}
            alt=""
            width={THUMBNAIL_WIDTH}
            height={THUMBNAIL_HEIGHT}
            loading="lazy"
            decoding="async"
            draggable={false}
          />
        )}
        <span>
          {definition.name}
          {pack !== null && (
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

export function BlocksTab(): JSX.Element {
  const [query, setQuery] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const packs = useStore((state) => state.editor.blockPacks);
  const savedBlocks = useStore((state) => state.editor.savedBlocks);
  const entries = useMemo(() => [...BUILT_IN_ENTRIES, ...packEntries(packs)], [packs]);
  const categoryGroups = useMemo(() => groupByCategory(entries), [entries]);
  const packGroups = useMemo(() => groupByPack(packs), [packs]);
  const isSearching = query.trim() !== '';
  const results = isSearching ? filterComponents(entries, query) : [];
  const savedResults = isSearching ? filterSavedBlocks(savedBlocks, query) : [];
  const hasResults = results.length > 0 || savedResults.length > 0;
  const isSavedOpen = categoryId === SAVED_GROUP_ID && savedBlocks.length > 0;
  const category = [...packGroups, ...categoryGroups].find(({ id }) => id === categoryId);
  const myBlockLinks = groupLinks(packGroups);
  if (savedBlocks.length > 0) {
    myBlockLinks.unshift({ id: SAVED_GROUP_ID, label: 'Saved blocks', count: savedBlocks.length });
  }
  const isListShown = !isSearching && !category && !isSavedOpen;

  return (
    <div className="ve-blocks" onDragOver={allowFileDrop} onDrop={loadDroppedPack}>
      <SearchInput
        className="ve-blocks-search"
        label="Search blocks"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />

      {isSearching && savedResults.length > 0 && <SavedBlockGrid records={savedResults} />}
      {isSearching && results.length > 0 && <ComponentGrid components={results} />}
      {isSearching && !hasResults && <p className="ui-muted">No blocks match “{query.trim()}”.</p>}

      {!isSearching && isSavedOpen && (
        <>
          <Button
            variant="ghost"
            icon="chevron-left"
            className="ve-back"
            onClick={() => setCategoryId(null)}
          >
            All categories
          </Button>
          <Title>Saved blocks</Title>
          <SavedBlockGrid records={savedBlocks} />
        </>
      )}

      {!isSearching && category && (
        <>
          <Button
            variant="ghost"
            icon="chevron-left"
            className="ve-back"
            onClick={() => setCategoryId(null)}
          >
            All categories
          </Button>
          <Title>{category.label}</Title>
          <ComponentGrid components={category.components} />
        </>
      )}

      {isListShown && myBlockLinks.length > 0 && (
        <section className="ve-my-blocks" aria-label="My blocks">
          <Title>My blocks</Title>
          <CategoryList groups={myBlockLinks} onOpen={setCategoryId} />
        </section>
      )}

      {isListShown && <CategoryList groups={groupLinks(categoryGroups)} onOpen={setCategoryId} />}

      {isListShown && (
        <div className="ve-pack-buttons">
          <Button variant="ghost" icon="upload" onClick={packCommands.loadFromDisk}>
            Load block pack
          </Button>
          <Button variant="ghost" onClick={packCommands.manage}>
            Manage packs
          </Button>
        </div>
      )}
    </div>
  );
}
