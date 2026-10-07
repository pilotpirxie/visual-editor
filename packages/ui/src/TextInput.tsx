import type { ComponentPropsWithRef, JSX } from 'react';
import { classNames } from './classNames';
import './Input.css';

type TextInputProps = ComponentPropsWithRef<'input'> & { isInvalid?: boolean };

export function TextInput({
  isInvalid = false,
  className,
  type = 'text',
  ...props
}: TextInputProps): JSX.Element {
  return (
    <input
      type={type}
      className={classNames('ui-input', className)}
      aria-invalid={isInvalid || undefined}
      {...props}
    />
  );
}
