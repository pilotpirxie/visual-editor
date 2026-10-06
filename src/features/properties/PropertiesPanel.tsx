import type { JSX } from 'react';
import { useStore } from '../../app/store';
import { registry } from '../../components/registry';
import { CATEGORIES } from '../../components/types';
import { TemporaryDesignFields } from './TemporaryDesignFields';
import './properties.css';

export function PropertiesPanel(): JSX.Element {
  const block = useStore((state) => {
    const { selectedBlockId } = state.editor;
    return selectedBlockId ? state.project.blocks.entities[selectedBlockId] : undefined;
  });

  if (!block) {
    return (
      <aside className="ve-panel ve-properties" aria-label="Properties">
        <TemporaryDesignFields />
      </aside>
    );
  }

  const definition = registry.get(block.componentId)?.definition;
  const category = CATEGORIES.find(({ id }) => id === definition?.category);

  return (
    <aside className="ve-panel ve-properties" aria-label="Properties">
      <header className="ve-properties-section">
        <h2 className="ve-properties-title">
          {definition?.name ?? `Missing component: ${block.componentId}`}
        </h2>
        {category && <p className="ve-muted">{category.label}</p>}
      </header>
    </aside>
  );
}
