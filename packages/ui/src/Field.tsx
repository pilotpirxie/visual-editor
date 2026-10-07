import type { JSX, ReactNode } from 'react';
import { classNames } from './classNames';
import './Field.css';

type FieldProps = {
  id: string;
  label: ReactNode;
  error?: string | null;
  layout?: 'stack' | 'inline';
  className?: string;
  children: ReactNode;
};

export function fieldErrorId(id: string): string {
  return `${id}-error`;
}

export function FieldError({
  id,
  error,
}: {
  id: string;
  error: string | null;
}): JSX.Element | null {
  if (error === null) return null;
  return (
    <p id={fieldErrorId(id)} className="ui-field-error" role="alert">
      {error}
    </p>
  );
}

export function Field({
  id,
  label,
  error = null,
  layout = 'stack',
  className,
  children,
}: FieldProps): JSX.Element {
  return (
    <div
      className={classNames('ui-field', className)}
      data-layout={layout}
      data-invalid={error !== null || undefined}
    >
      <label className="ui-field-label" htmlFor={id}>
        {label}
      </label>
      <div className="ui-field-control">{children}</div>
      <FieldError id={id} error={error} />
    </div>
  );
}
