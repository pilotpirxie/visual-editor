import { useState, type ChangeEvent, type FocusEvent, type JSX } from 'react';
import { validateField } from '../../components/fields';
import type { Field, FieldType } from '../../components/types';
import { hasIcon, Icon } from '../editor/Icon';
import { ColorField } from './ColorField';
import { IconField } from './IconField';
import { ImageField } from './ImageField';
import { ListField } from './ListField';
import { RichTextField } from './RichTextField';

export type ControlProps = {
  field: Field;
  value: unknown;
  id: string;
  path: string;
  describedBy: string | undefined;
  isInvalid: boolean;
  onChange(value: unknown): void;
};

type FieldControlProps = {
  field: Field;
  value: unknown;
  path: string;
  onChange(value: unknown): void;
};

type Draft = { value: unknown; base: unknown };

function asText(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function asNumberText(value: unknown): string {
  if (typeof value === 'number' && !Number.isNaN(value)) return String(value);
  return asText(value);
}

function numberFromInput(event: ChangeEvent<HTMLInputElement>): number | string {
  const { valueAsNumber, value } = event.target;
  return Number.isNaN(valueAsNumber) ? value : valueAsNumber;
}

function Label({ id, field }: { id: string; field: Field }): JSX.Element {
  return (
    <label className="ve-control-label" htmlFor={id}>
      {field.label}
    </label>
  );
}

function TextControl({
  field,
  value,
  id,
  describedBy,
  isInvalid,
  onChange,
}: ControlProps): JSX.Element {
  return (
    <>
      <Label id={id} field={field} />
      <input
        id={id}
        className="ve-input"
        type="text"
        value={asText(value)}
        maxLength={field.maxLength}
        aria-required={field.required}
        aria-invalid={isInvalid}
        aria-describedby={describedBy}
        onChange={(event) => onChange(event.target.value)}
      />
    </>
  );
}

function TextareaControl({
  field,
  value,
  id,
  describedBy,
  isInvalid,
  onChange,
}: ControlProps): JSX.Element {
  return (
    <>
      <Label id={id} field={field} />
      <textarea
        id={id}
        className="ve-input"
        rows={3}
        value={asText(value)}
        maxLength={field.maxLength}
        aria-required={field.required}
        aria-invalid={isInvalid}
        aria-describedby={describedBy}
        onChange={(event) => onChange(event.target.value)}
      />
    </>
  );
}

function NumberControl({
  field,
  value,
  id,
  describedBy,
  isInvalid,
  onChange,
}: ControlProps): JSX.Element {
  return (
    <>
      <Label id={id} field={field} />
      <input
        id={id}
        className="ve-input ve-input--number"
        type="number"
        value={asNumberText(value)}
        min={field.min}
        max={field.max}
        step={field.step}
        aria-required={field.required}
        aria-invalid={isInvalid}
        aria-describedby={describedBy}
        onChange={(event) => onChange(numberFromInput(event))}
      />
    </>
  );
}

function RangeControl({
  field,
  value,
  id,
  describedBy,
  isInvalid,
  onChange,
}: ControlProps): JSX.Element {
  return (
    <>
      <Label id={id} field={field} />
      <div className="ve-range">
        <input
          id={id}
          type="range"
          value={asNumberText(value)}
          min={field.min}
          max={field.max}
          step={field.step}
          aria-describedby={describedBy}
          onChange={(event) => onChange(numberFromInput(event))}
        />
        <input
          className="ve-input ve-input--number"
          type="number"
          value={asNumberText(value)}
          min={field.min}
          max={field.max}
          step={field.step}
          aria-label={`${field.label} value`}
          aria-invalid={isInvalid}
          aria-describedby={describedBy}
          onChange={(event) => onChange(numberFromInput(event))}
        />
      </div>
    </>
  );
}

function BooleanControl({ field, value, id, describedBy, onChange }: ControlProps): JSX.Element {
  return (
    <label className="ve-switch" htmlFor={id}>
      <input
        id={id}
        type="checkbox"
        role="switch"
        checked={value === true}
        aria-describedby={describedBy}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className="ve-control-label">{field.label}</span>
    </label>
  );
}

function SelectControl({
  field,
  value,
  id,
  describedBy,
  isInvalid,
  onChange,
}: ControlProps): JSX.Element {
  return (
    <>
      <Label id={id} field={field} />
      <select
        id={id}
        className="ve-input"
        value={asText(value)}
        aria-invalid={isInvalid}
        aria-describedby={describedBy}
        onChange={(event) => onChange(event.target.value)}
      >
        {field.options?.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </>
  );
}

function SegmentedControl({ field, value, id, describedBy, onChange }: ControlProps): JSX.Element {
  return (
    <fieldset className="ve-segmented" aria-describedby={describedBy}>
      <legend className="ve-control-label">{field.label}</legend>
      <div className="ve-segmented-options">
        {field.options?.map((option) => {
          const iconName = option.icon !== undefined && hasIcon(option.icon) ? option.icon : null;
          return (
            <label key={option.value} className="ve-segment" title={option.label}>
              <input
                type="radio"
                name={id}
                value={option.value}
                checked={value === option.value}
                onChange={() => onChange(option.value)}
              />
              {iconName !== null ? (
                <>
                  <Icon name={iconName} />
                  <span className="ve-visually-hidden">{option.label}</span>
                </>
              ) : (
                option.label
              )}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

function DateControl({
  field,
  value,
  id,
  describedBy,
  isInvalid,
  onChange,
}: ControlProps): JSX.Element {
  return (
    <>
      <Label id={id} field={field} />
      <input
        id={id}
        className="ve-input"
        type="date"
        value={asText(value)}
        aria-required={field.required}
        aria-invalid={isInvalid}
        aria-describedby={describedBy}
        onChange={(event) => onChange(event.target.value)}
      />
    </>
  );
}

const CONTROLS: Partial<Record<FieldType, (props: ControlProps) => JSX.Element>> = {
  text: TextControl,
  textarea: TextareaControl,
  number: NumberControl,
  range: RangeControl,
  boolean: BooleanControl,
  select: SelectControl,
  segmented: SegmentedControl,
  date: DateControl,
  list: ListField,
  color: ColorField,
  image: ImageField,
  richtext: RichTextField,
  icon: IconField,
};

export function hasControl(field: Field): boolean {
  return CONTROLS[field.type] !== undefined;
}

export function FieldControl({
  field,
  value,
  path,
  onChange,
}: FieldControlProps): JSX.Element | null {
  const [draft, setDraft] = useState<Draft | null>(null);
  const Control = CONTROLS[field.type];
  if (Control === undefined) return null;

  const activeDraft = draft !== null && Object.is(draft.base, value) ? draft : null;
  const shownValue = activeDraft === null ? value : activeDraft.value;
  const error = activeDraft === null ? null : validateField(field, activeDraft.value);
  const id = `ve-field-${path}`;
  const helpId = `${id}-help`;
  const errorId = `${id}-error`;
  const descriptionIds: string[] = [];
  if (field.help) descriptionIds.push(helpId);
  if (error !== null) descriptionIds.push(errorId);
  const describedBy = descriptionIds.length > 0 ? descriptionIds.join(' ') : undefined;

  function change(next: unknown): void {
    if (validateField(field, next) === null) {
      setDraft(null);
      onChange(next);
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
        describedBy={describedBy}
        isInvalid={error !== null}
        onChange={change}
      />
      {field.help && (
        <p id={helpId} className="ve-control-help">
          {field.help}
        </p>
      )}
      {error !== null && (
        <p id={errorId} className="ve-control-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
