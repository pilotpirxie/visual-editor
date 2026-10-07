import { useState, type JSX, type PointerEvent } from 'react';
import { dispatch } from '../../app/store';
import { registry } from '../../components/registry';
import { CATEGORIES, type RegisteredComponent } from '../../components/types';
import { dragController } from '../canvas/dragController';
import { insertComponent } from '../editor/blockActions';
import { filterComponents } from './search';
import { Button, SearchInput, Title } from '../../../packages/ui/src';

const THUMBNAIL_WIDTH = 640;
const THUMBNAIL_HEIGHT = 400;

type CategoryGroup = { id: string; label: string; components: RegisteredComponent[] };

export function groupByCategory(components: RegisteredComponent[]): CategoryGroup[] {
  const groups: CategoryGroup[] = [];
  for (const { id, label } of CATEGORIES) {
    const inCategory = components.filter(({ definition }) => definition.category === id);
    if (inCategory.length > 0) groups.push({ id, label, components: inCategory });
  }
  return groups;
}

const COMPONENTS = [...registry.values()];
const CATEGORY_GROUPS = groupByCategory(COMPONENTS);

function ComponentCard({ component }: { component: RegisteredComponent }): JSX.Element {
  const { definition, thumbnail } = component;

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
        <span>{definition.name}</span>
      </button>
    </li>
  );
}

function ComponentGrid({ components }: { components: RegisteredComponent[] }): JSX.Element {
  return (
    <ul className="ve-component-grid">
      {components.map((component) => (
        <ComponentCard key={component.definition.id} component={component} />
      ))}
    </ul>
  );
}

export function BlocksTab(): JSX.Element {
  const [query, setQuery] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const isSearching = query.trim() !== '';
  const results = isSearching ? filterComponents(COMPONENTS, query) : [];
  const category = CATEGORY_GROUPS.find(({ id }) => id === categoryId);

  return (
    <div className="ve-blocks">
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

      {!isSearching && !category && (
        <ul className="ve-categories">
          {CATEGORY_GROUPS.map(({ id, label, components }) => (
            <li key={id}>
              <button type="button" onClick={() => setCategoryId(id)}>
                {label}
                <span className="ve-count">{components.length}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
