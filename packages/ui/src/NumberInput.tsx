import type { ComponentPropsWithRef, JSX } from 'react';
import { classNames } from './classNames';
import './Input.css';

type NumberInputProps = Omit<ComponentPropsWithRef<'input'>, 'type'> & {
  unit?: string;
  isInvalid?: boolean;
};

export function NumberInput({
  unit,
  isInvalid = false,
  className,
  ...props
}: NumberInputProps): JSX.Element {
  const input = (
    <input
      type="number"
      className={classNames('ui-input', 'ui-input--number', className)}
      aria-invalid={isInvalid || undefined}
      {...props}
    />
  );
  if (unit === undefined) return input;
  return (
    <span className="ui-number">
      {input}
      <span className="ui-unit" aria-hidden="true">
        {unit}
      </span>
    </span>
  );
}
