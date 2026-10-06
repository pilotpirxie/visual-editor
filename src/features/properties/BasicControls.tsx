import type { ChangeEvent, JSX } from 'react';
import type { Field } from '../../components/types';
import { hasIcon, Icon } from '../editor/Icon';
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

function ControlLabel({ id, field }: { id: string; field: Field }): JSX.Element {
  return (
    <label className="ve-control-label" htmlFor={id}>
      {field.label}
    </label>
  );
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
    <>
      <ControlLabel id={id} field={field} />
      <input
        id={id}
        className="ve-input"
        type={isDate ? 'date' : 'text'}
        value={asText(value)}
        maxLength={field.maxLength}
        aria-required={field.required}
        aria-invalid={isInvalid}
        aria-describedby={describedBy}
        onChange={(event) => onChange(event.target.value, isDate ? 'discrete' : 'continuous')}
      />
    </>
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
    <>
      <ControlLabel id={id} field={field} />
      <textarea
        id={id}
        className="ve-input"
        rows={TEXTAREA_ROWS}
        value={asText(value)}
        maxLength={field.maxLength}
        aria-required={field.required}
        aria-invalid={isInvalid}
        aria-describedby={describedBy}
        onChange={(event) => onChange(event.target.value, 'continuous')}
      />
    </>
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
    <>
      <ControlLabel id={id} field={field} />
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
        onChange={(event) => onChange(numberFromInput(event), 'continuous')}
      />
    </>
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
    <>
      <ControlLabel id={id} field={field} />
      <div className="ve-range">
        <input
          id={id}
          type="range"
          value={asNumberText(value)}
          min={field.min}
          max={field.max}
          step={field.step}
          aria-describedby={describedBy}
          onChange={(event) => onChange(numberFromInput(event), 'continuous')}
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
          onChange={(event) => onChange(numberFromInput(event), 'continuous')}
        />
      </div>
    </>
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
    <label className="ve-switch" htmlFor={id}>
      <input
        id={id}
        type="checkbox"
        role="switch"
        checked={value === true}
        aria-describedby={describedBy}
        onChange={(event) => onChange(event.target.checked, 'discrete')}
      />
      <span className="ve-control-label">{field.label}</span>
    </label>
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
    <>
      <ControlLabel id={id} field={field} />
      <select
        id={id}
        className="ve-input"
        value={asText(value)}
        aria-invalid={isInvalid}
        aria-describedby={describedBy}
        onChange={(event) => onChange(event.target.value, 'discrete')}
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

function SegmentLabel({ label, icon }: { label: string; icon: string | undefined }): JSX.Element {
  if (icon === undefined || !hasIcon(icon)) return <>{label}</>;
  return (
    <>
      <Icon name={icon} />
      <span className="ve-visually-hidden">{label}</span>
    </>
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
    <fieldset className="ve-segmented" aria-describedby={describedBy}>
      <legend className="ve-control-label">{field.label}</legend>
      <div className="ve-segmented-options">
        {field.options?.map((option) => (
          <label key={option.value} className="ve-segment" title={option.label}>
            <input
              type="radio"
              name={id}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value, 'discrete')}
            />
            <SegmentLabel label={option.label} icon={option.icon} />
          </label>
        ))}
      </div>
    </fieldset>
  );
}
