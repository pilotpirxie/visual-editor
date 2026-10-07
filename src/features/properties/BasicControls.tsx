import type { ChangeEvent, JSX } from 'react';
import {
  Field,
  NumberInput,
  SegmentedControl as SegmentedInput,
  Select,
  Switch,
  TextArea,
  TextInput,
} from '../../../packages/ui/src';
import type { ControlProps } from './FieldControl';

const TEXTAREA_ROWS = 3;

function asText(value: unknown): string {
  if (typeof value === 'string') return value;
  return '';
}

function asNumberText(value: unknown): string {
  if (typeof value === 'number' && !Number.isNaN(value)) return String(value);
  return asText(value);
}

function numberFromInput(event: ChangeEvent<HTMLInputElement>): number | string {
  const { valueAsNumber, value } = event.target;
  if (Number.isNaN(valueAsNumber)) return value;
  return valueAsNumber;
}

export function TextControl({
  field,
  value,
  id,
  describedBy,
  isInvalid,
  onChange,
}: ControlProps): JSX.Element {
  const isDate = field.type === 'date';
  return (
    <Field id={id} label={field.label}>
      <TextInput
        id={id}
        type={isDate ? 'date' : 'text'}
        value={asText(value)}
        maxLength={field.maxLength}
        aria-required={field.required}
        isInvalid={isInvalid}
        aria-describedby={describedBy}
        onChange={(event) => onChange(event.target.value, isDate ? 'discrete' : 'continuous')}
      />
    </Field>
  );
}

export function TextareaControl({
  field,
  value,
  id,
  describedBy,
  isInvalid,
  onChange,
}: ControlProps): JSX.Element {
  return (
    <Field id={id} label={field.label}>
      <TextArea
        id={id}
        rows={TEXTAREA_ROWS}
        value={asText(value)}
        maxLength={field.maxLength}
        aria-required={field.required}
        isInvalid={isInvalid}
        aria-describedby={describedBy}
        onChange={(event) => onChange(event.target.value, 'continuous')}
      />
    </Field>
  );
}

export function NumberControl({
  field,
  value,
  id,
  describedBy,
  isInvalid,
  onChange,
}: ControlProps): JSX.Element {
  return (
    <Field id={id} label={field.label}>
      <NumberInput
        id={id}
        value={asNumberText(value)}
        min={field.min}
        max={field.max}
        step={field.step}
        aria-required={field.required}
        isInvalid={isInvalid}
        aria-describedby={describedBy}
        onChange={(event) => onChange(numberFromInput(event), 'continuous')}
      />
    </Field>
  );
}

export function RangeControl({
  field,
  value,
  id,
  describedBy,
  isInvalid,
  onChange,
}: ControlProps): JSX.Element {
  return (
    <Field id={id} label={field.label}>
      <input
        id={id}
        type="range"
        className="ve-range-input"
        value={asNumberText(value)}
        min={field.min}
        max={field.max}
        step={field.step}
        aria-describedby={describedBy}
        onChange={(event) => onChange(numberFromInput(event), 'continuous')}
      />
      <NumberInput
        value={asNumberText(value)}
        min={field.min}
        max={field.max}
        step={field.step}
        aria-label={`${field.label} value`}
        isInvalid={isInvalid}
        aria-describedby={describedBy}
        onChange={(event) => onChange(numberFromInput(event), 'continuous')}
      />
    </Field>
  );
}

export function BooleanControl({
  field,
  value,
  id,
  describedBy,
  onChange,
}: ControlProps): JSX.Element {
  return (
    <Switch
      id={id}
      label={field.label}
      checked={value === true}
      aria-describedby={describedBy}
      onChange={(event) => onChange(event.target.checked, 'discrete')}
    />
  );
}

export function SelectControl({
  field,
  value,
  id,
  describedBy,
  isInvalid,
  onChange,
}: ControlProps): JSX.Element {
  return (
    <Field id={id} label={field.label}>
      <Select
        id={id}
        value={asText(value)}
        options={field.options ?? []}
        isInvalid={isInvalid}
        aria-describedby={describedBy}
        onChange={(event) => onChange(event.target.value, 'discrete')}
      />
    </Field>
  );
}

export function SegmentedControl({
  field,
  value,
  id,
  describedBy,
  onChange,
}: ControlProps): JSX.Element {
  return (
    <SegmentedInput
      legend={field.label}
      name={id}
      options={field.options ?? []}
      value={asText(value)}
      describedBy={describedBy}
      onChange={(next) => onChange(next, 'discrete')}
    />
  );
}
