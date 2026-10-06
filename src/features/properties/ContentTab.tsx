import type { JSX } from 'react';
import { blockValueSet } from '../../app/projectSlice';
import { dispatch } from '../../app/store';
import type { Block } from '../../app/types';
import { groupFields, isFieldVisible, type FieldGroup } from '../../components/fields';
import type { ComponentDefinition } from '../../components/types';
import { FieldControl } from './FieldControl';

function editableGroups(
  definition: ComponentDefinition,
  values: Record<string, unknown>,
): FieldGroup[] {
  const groups: FieldGroup[] = [];
  for (const group of groupFields(definition)) {
    const fields = group.fields.filter((field) => isFieldVisible(field, values));
    if (fields.length > 0) groups.push({ name: group.name, fields });
  }
  return groups;
}

export function ContentTab({
  block,
  definition,
}: {
  block: Block;
  definition: ComponentDefinition;
}): JSX.Element {
  return (
    <>
      {editableGroups(definition, block.values).map((group) => (
        <section key={group.name} className="ve-properties-section">
          <h3 className="ve-group-title">{group.name}</h3>
          {group.fields.map((field) => (
            <FieldControl
              key={field.name}
              field={field}
              value={block.values[field.name]}
              path={field.name}
              onChange={(value, kind) => dispatch(blockValueSet(block.id, field.name, value, kind))}
            />
          ))}
        </section>
      ))}
    </>
  );
}
