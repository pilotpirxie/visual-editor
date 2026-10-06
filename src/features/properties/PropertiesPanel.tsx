import { useEffect, useRef, type JSX } from 'react';
import { focusRequestHandled } from '../../app/editorSlice';
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

function focusField(container: HTMLElement, path: string): boolean {
  const field = container.querySelector(`[data-field-path="${CSS.escape(path)}"]`);
  if (field === null) return false;
  const details = field.querySelector('details');
  if (details !== null) details.open = true;
  const target =
    field.querySelector<HTMLElement>(TEXT_ENTRY_TARGETS) ??
    field.querySelector<HTMLElement>(BUTTON_TARGETS);
  if (target === null) return false;
  target.focus();
  return target.ownerDocument.activeElement === target;
}

function categoryLabelOf(definition: ComponentDefinition): string | null {
  for (const category of CATEGORIES) {
    if (category.id === definition.category) return category.label;
  }
  return null;
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
    if (selectedBlockId === null) return null;
    return state.project.blocks.entities[selectedBlockId] ?? null;
  });
  const focusRequest = useStore((state) => state.editor.focusRequest);
  const compactView = useStore((state) => state.editor.compactView);
  const isCollapsed = useStore((state) => state.editor.panels.right.collapsed);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const body = bodyRef.current;
    if (focusRequest === null || body === null) return;
    const hasFocused = focusField(body, focusRequest.path);
    if (hasFocused) dispatch(focusRequestHandled());
  }, [focusRequest, compactView, isCollapsed]);

  if (block === null) {
    return (
      <aside className="ve-panel ve-properties" aria-label="Properties">
        <TemporaryDesignFields />
      </aside>
    );
  }

  const component = registry.get(block.componentId);
  const definition = component === undefined ? null : component.definition;
  const title = definition === null ? `Missing component: ${block.componentId}` : definition.name;
  const categoryLabel = definition === null ? null : categoryLabelOf(definition);
  const groups = definition === null ? [] : editableGroups(definition, block.values);

  return (
    <aside className="ve-panel ve-properties" aria-label="Properties">
      <header className="ve-properties-section">
        <h2 className="ve-properties-title">{title}</h2>
        {categoryLabel !== null && <p className="ve-muted">{categoryLabel}</p>}
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
                onChange={(value, kind) =>
                  dispatch(blockValueSet(block.id, field.name, value, kind))
                }
              />
            ))}
          </section>
        ))}
      </div>
    </aside>
  );
}
