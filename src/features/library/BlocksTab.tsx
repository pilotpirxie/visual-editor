import { useMemo, useState, type DragEvent, type JSX, type PointerEvent } from 'react';
import { dispatch, useStore } from '../../app/store';
import { registry } from '../../components/registry';
import type { BlockPack } from '../../components/types';
import { CATEGORIES } from '../../components/types';
import { packCommands } from '../block-packs/packCommands';
import { packEntries, type LibraryEntry } from '../block-packs/packLibrary';
import { dragController } from '../canvas/dragController';
import { insertComponent } from '../editor/blockActions';
import { filterComponents } from './search';
import { Button, SearchInput, Title } from '../../../packages/ui/src';

const THUMBNAIL_WIDTH = 640;
const THUMBNAIL_HEIGHT = 400;

type CategoryGroup = { id: string; label: string; components: LibraryEntry[] };

const PACK_GROUP_PREFIX = 'pack:';

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
        title={definition.description}
        onClick={() => dispatch(insertComponent(definition.id))}
        onPointerDown={startDrag}
      >
        <img
          src={thumbnail}
          alt=""
          width={THUMBNAIL_WIDTH}
          height={THUMBNAIL_HEIGHT}
          draggable={false}
        />
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
    </li>
  );
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

function CategoryList({
  groups,
  onOpen,
}: {
  groups: CategoryGroup[];
  onOpen(id: string): void;
}): JSX.Element {
  return (
    <ul className="ve-categories">
      {groups.map(({ id, label, components }) => (
        <li key={id}>
          <button type="button" onClick={() => onOpen(id)}>
            {label}
            <span className="ve-count">{components.length}</span>
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
  const entries = useMemo(() => [...BUILT_IN_ENTRIES, ...packEntries(packs)], [packs]);
  const categoryGroups = useMemo(() => groupByCategory(entries), [entries]);
  const packGroups = useMemo(() => groupByPack(packs), [packs]);
  const isSearching = query.trim() !== '';
  const results = isSearching ? filterComponents(entries, query) : [];
  const category = [...packGroups, ...categoryGroups].find(({ id }) => id === categoryId);

  return (
    <div className="ve-blocks" onDragOver={allowFileDrop} onDrop={loadDroppedPack}>
      <SearchInput
        className="ve-blocks-search"
        label="Search blocks"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />

      {isSearching && results.length > 0 && <ComponentGrid components={results} />}
      {isSearching && results.length === 0 && (
        <p className="ui-muted">No blocks match “{query.trim()}”.</p>
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

      {!isSearching && !category && packGroups.length > 0 && (
        <section className="ve-my-blocks" aria-label="My blocks">
          <Title>My blocks</Title>
          <CategoryList groups={packGroups} onOpen={setCategoryId} />
        </section>
      )}

      {!isSearching && !category && <CategoryList groups={categoryGroups} onOpen={setCategoryId} />}

      {!isSearching && !category && (
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
