import { useEffect, useRef, type JSX } from 'react';
import { blockValueSet } from '../../app/projectSlice';
import { dispatch, useStore } from '../../app/store';
import { groupFields, isFieldVisible, type FieldGroup } from '../../components/fields';
import { registry } from '../../components/registry';
import { CATEGORIES, type ComponentDefinition } from '../../components/types';
import { FieldControl, hasControl } from './FieldControl';
import { TemporaryDesignFields } from './TemporaryDesignFields';
import './properties.css';

const TEXT_ENTRY_TARGETS = 'input, textarea, select, [contenteditable="true"]';
const BUTTON_TARGETS = 'button, summary';

function focusField(container: HTMLElement, path: string): void {
  const field = container.querySelector(`[data-field-path="${CSS.escape(path)}"]`);
  if (field === null) return;
  const details = field.querySelector('details');
  if (details !== null) details.open = true;
  const target =
    field.querySelector<HTMLElement>(TEXT_ENTRY_TARGETS) ??
    field.querySelector<HTMLElement>(BUTTON_TARGETS);
  target?.focus();
}

function editableGroups(
  definition: ComponentDefinition,
  values: Record<string, unknown>,
): FieldGroup[] {
  const groups: FieldGroup[] = [];
  for (const group of groupFields(definition)) {
    const fields = group.fields.filter(
      (field) => hasControl(field) && isFieldVisible(field, values),
    );
    if (fields.length > 0) groups.push({ name: group.name, fields });
  }
  return groups;
}

export function PropertiesPanel(): JSX.Element {
  const block = useStore((state) => {
    const { selectedBlockId } = state.editor;
    return selectedBlockId ? state.project.blocks.entities[selectedBlockId] : undefined;
  });
  const focusRequest = useStore((state) => state.editor.focusRequest);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const body = bodyRef.current;
    if (focusRequest === null || body === null) return;
    focusField(body, focusRequest.path);
  }, [focusRequest]);

  if (!block) {
    return (
      <aside className="ve-panel ve-properties" aria-label="Properties">
        <TemporaryDesignFields />
      </aside>
    );
  }

  const definition = registry.get(block.componentId)?.definition;
  const category = CATEGORIES.find(({ id }) => id === definition?.category);
  const groups = definition ? editableGroups(definition, block.values) : [];

  return (
    <aside className="ve-panel ve-properties" aria-label="Properties">
      <header className="ve-properties-section">
        <h2 className="ve-properties-title">
          {definition?.name ?? `Missing component: ${block.componentId}`}
        </h2>
        {category && <p className="ve-muted">{category.label}</p>}
      </header>
      <div className="ve-properties-body" key={block.id} ref={bodyRef}>
        {groups.map((group) => (
          <section key={group.name} className="ve-properties-section">
            <h3 className="ve-group-title">{group.name}</h3>
            {group.fields.map((field) => (
              <FieldControl
                key={field.name}
                field={field}
                value={block.values[field.name]}
                path={field.name}
                onChange={(value) => dispatch(blockValueSet(block.id, field.name, value))}
              />
            ))}
          </section>
        ))}
      </div>
    </aside>
  );
}
