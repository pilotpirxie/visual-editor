import { useState, type FocusEvent, type JSX } from 'react';
import type { EditKind } from '../../app/projectSlice';
import { validateField } from '../../components/fields';
import type { Field, FieldType } from '../../components/types';
import {
  BooleanControl,
  NumberControl,
  RangeControl,
  SegmentedControl,
  SelectControl,
  TextareaControl,
  TextControl,
} from './BasicControls';
import { ColorField } from './ColorField';
import { IconField } from './IconField';
import { ImageField } from './ImageField';
import { ButtonField, LinkField } from './LinkField';
import { ListField } from './ListField';
import { RichTextField } from './RichTextField';

export type ControlProps = {
  field: Field;
  value: unknown;
  id: string;
  path: string;
  describedBy: string | undefined;
  isInvalid: boolean;
  onChange(value: unknown, kind: EditKind): void;
};

type FieldControlProps = {
  field: Field;
  value: unknown;
  path: string;
  onChange(value: unknown, kind: EditKind): void;
};

type Draft = { value: unknown; base: unknown };

const CONTROLS: Record<FieldType, (props: ControlProps) => JSX.Element> = {
  text: TextControl,
  date: TextControl,
  textarea: TextareaControl,
  number: NumberControl,
  range: RangeControl,
  boolean: BooleanControl,
  select: SelectControl,
  segmented: SegmentedControl,
  list: ListField,
  color: ColorField,
  image: ImageField,
  richtext: RichTextField,
  icon: IconField,
  link: LinkField,
  button: ButtonField,
};

function describedByIds(helpId: string | null, errorId: string | null): string | undefined {
  const ids: string[] = [];
  if (helpId !== null) ids.push(helpId);
  if (errorId !== null) ids.push(errorId);
  if (ids.length === 0) return undefined;
  return ids.join(' ');
}

export function FieldControl({ field, value, path, onChange }: FieldControlProps): JSX.Element {
  const [draft, setDraft] = useState<Draft | null>(null);
  const isDraftStale = draft !== null && !Object.is(draft.base, value);
  if (isDraftStale) setDraft(null);

  const Control = CONTROLS[field.type];

  const activeDraft = isDraftStale ? null : draft;
  const shownValue = activeDraft === null ? value : activeDraft.value;
  const error = activeDraft === null ? null : validateField(field, activeDraft.value);
  const id = `ve-field-${path}`;
  const helpId = field.help ? `${id}-help` : null;
  const errorId = error !== null ? `${id}-error` : null;

  function change(next: unknown, kind: EditKind): void {
    if (validateField(field, next) === null) {
      setDraft(null);
      onChange(next, kind);
      return;
    }
    setDraft({ value: next, base: value });
  }

  function dropDraftOnLeave(event: FocusEvent<HTMLDivElement>): void {
    if (event.currentTarget.contains(event.relatedTarget)) return;
    setDraft(null);
  }

  return (
    <div
      className="ve-control"
      data-field-path={path}
      data-invalid={error !== null || undefined}
      onBlur={dropDraftOnLeave}
    >
      <Control
        field={field}
        value={shownValue}
        id={id}
        path={path}
        describedBy={describedByIds(helpId, errorId)}
        isInvalid={error !== null}
        onChange={change}
      />
      {helpId !== null && (
        <p id={helpId} className="ve-control-help">
          {field.help}
        </p>
      )}
      {errorId !== null && (
        <p id={errorId} className="ve-control-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
