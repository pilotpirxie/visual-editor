import { useState, type JSX, type ReactNode } from 'react';
import { blockValueSet, type EditKind } from '../../app/projectSlice';
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

function normalizedLabel(label: string): string {
  return label.toLowerCase().replace(/\s+/g, '');
}

function repeatsGroupName(group: FieldGroup): boolean {
  const [onlyField] = group.fields;
  if (group.fields.length !== 1 || onlyField === undefined) return false;
  return normalizedLabel(onlyField.label) === normalizedLabel(group.name);
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

type ValueChange = (value: unknown, kind: EditKind) => void;

export function ContentTab({
  block,
  definition,
}: {
  block: ComponentBlock;
  definition: ComponentDefinition;
}): JSX.Element {
  const [changeHandlers] = useState(() => new Map<string, ValueChange>());

  function changeHandlerFor(name: string): ValueChange {
    const key = `${block.id}:${name}`;
    let handler = changeHandlers.get(key);
    if (handler === undefined) {
      const blockId = block.id;
      handler = (value, kind) => dispatch(blockValueSet(blockId, name, value, kind));
      changeHandlers.set(key, handler);
    }
    return handler;
  }

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
              isLabelHidden={repeatsGroupName(group)}
              onChange={changeHandlerFor(field.name)}
            />
          ))}
        </ContentSection>
      ))}
    </>
  );
}
