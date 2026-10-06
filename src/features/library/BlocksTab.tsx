import { useState, type JSX } from 'react';
import { registry } from '../../components/registry';
import { CATEGORIES, type RegisteredComponent } from '../../components/types';
import { dragController } from '../canvas/dragController';
import { insertComponent } from '../editor/blockActions';
import { Icon } from '../editor/Icon';
import { filterComponents } from './search';

const COMPONENTS = [...registry.values()];

const CATEGORY_GROUPS: { id: string; label: string; components: RegisteredComponent[] }[] = [];
for (const { id, label } of CATEGORIES) {
  const components = COMPONENTS.filter(({ definition }) => definition.category === id);
  if (components.length > 0) CATEGORY_GROUPS.push({ id, label, components });
}

function ComponentCard({ component }: { component: RegisteredComponent }): JSX.Element {
  const { definition, thumbnail } = component;
  return (
    <li>
      <button
        type="button"
        className="ve-component-card"
        title={definition.description}
        onClick={() => insertComponent(definition.id)}
        onPointerDown={(event) =>
          dragController.start(
            { kind: 'new', componentId: definition.id, label: definition.name },
            event,
          )
        }
      >
        <img src={thumbnail} alt="" width={640} height={400} draggable={false} />
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
      <label className="ve-search">
        <Icon name="search" />
        <input
          type="search"
          placeholder="Search blocks"
          aria-label="Search blocks"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>

      {isSearching && results.length > 0 && <ComponentGrid components={results} />}
      {isSearching && results.length === 0 && (
        <p className="ve-muted">No blocks match “{query.trim()}”.</p>
      )}

      {!isSearching && category && (
        <>
          <button type="button" className="ve-back" onClick={() => setCategoryId(null)}>
            <Icon name="chevron-left" />
            All categories
          </button>
          <h2 className="ve-heading">{category.label}</h2>
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
