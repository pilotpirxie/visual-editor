import { useLayoutEffect, useRef, type ChangeEvent, type JSX, type KeyboardEvent } from 'react';
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

const LINE_BREAKS = /\r\n?|\n/g;

export function singleLine(text: string): string {
  return text.replace(LINE_BREAKS, ' ');
}

function blockEnter(event: KeyboardEvent<HTMLTextAreaElement>): void {
  if (event.key === 'Enter' && !event.nativeEvent.isComposing) event.preventDefault();
}

function supportsFieldSizing(): boolean {
  if (typeof CSS === 'undefined' || typeof CSS.supports !== 'function') return false;
  return CSS.supports('field-sizing', 'content');
}

function useFittedHeight(value: string): (textarea: HTMLTextAreaElement | null) => void {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    if (textarea === null || supportsFieldSizing()) return;
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight + textarea.offsetHeight - textarea.clientHeight}px`;
  }, [value]);
  return (textarea) => {
    textareaRef.current = textarea;
  };
}

export function TextControl({
  field,
  value,
  id,
  describedBy,
  isInvalid,
  onChange,
}: ControlProps): JSX.Element {
  const text = asText(value);
  const fitHeight = useFittedHeight(text);
  if (field.type === 'date') {
    return (
      <Field id={id} label={field.label}>
        <TextInput
          id={id}
          type="date"
          value={asText(value)}
          aria-required={field.required}
          isInvalid={isInvalid}
          aria-describedby={describedBy}
          onChange={(event) => onChange(event.target.value, 'discrete')}
        />
      </Field>
    );
  }
  return (
    <Field id={id} label={field.label}>
      <TextArea
        ref={fitHeight}
        id={id}
        rows={1}
        className="ve-single-line"
        aria-multiline="false"
        value={text}
        placeholder={field.placeholder}
        maxLength={field.maxLength}
        aria-required={field.required}
        isInvalid={isInvalid}
        aria-describedby={describedBy}
        onKeyDown={blockEnter}
        onChange={(event) => onChange(singleLine(event.target.value), 'continuous')}
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
        placeholder={field.placeholder}
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
