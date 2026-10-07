import type { JSX, ReactNode } from 'react';
import { blockValueSet } from '../../app/projectSlice';
import { dispatch } from '../../app/store';
import type { ComponentBlock } from '../../app/types';
import { groupFields, isFieldVisible, type FieldGroup } from '../../components/fields';
import type { ComponentDefinition } from '../../components/types';
import { FieldControl } from './FieldControl';
import { useSection } from '../editor/useSection';
import { Section } from '../../../packages/ui/src';

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

function ContentSection({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}): JSX.Element {
  const section = useSection(id);
  return (
    <Section title={title} isOpen={section.isOpen} onToggle={section.onToggle}>
      {children}
    </Section>
  );
}

export function ContentTab({
  block,
  definition,
}: {
  block: ComponentBlock;
  definition: ComponentDefinition;
}): JSX.Element {
  return (
    <>
      {editableGroups(definition, block.values).map((group) => (
        <ContentSection
          key={group.name}
          id={`content:${definition.id}:${group.name}`}
          title={group.name}
        >
          {group.fields.map((field) => (
            <FieldControl
              key={field.name}
              field={field}
              value={block.values[field.name]}
              path={field.name}
              onChange={(value, kind) => dispatch(blockValueSet(block.id, field.name, value, kind))}
            />
          ))}
        </ContentSection>
      ))}
    </>
  );
}
