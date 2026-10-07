import type { ComponentPropsWithRef, JSX } from 'react';
import { classNames } from './classNames';
import './Input.css';

export type SelectOption = { value: string; label: string; isDisabled?: boolean };

type SelectProps = ComponentPropsWithRef<'select'> & {
  options?: readonly SelectOption[];
  isInvalid?: boolean;
};

export function Select({
  options = [],
  isInvalid = false,
  className,
  children,
  ...props
}: SelectProps): JSX.Element {
  return (
    <select
      className={classNames('ui-input', 'ui-select', className)}
      aria-invalid={isInvalid || undefined}
      {...props}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value} disabled={option.isDisabled}>
          {option.label}
        </option>
      ))}
      {children}
    </select>
  );
}
