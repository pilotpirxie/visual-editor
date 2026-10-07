import type { ComponentPropsWithRef, JSX } from 'react';
import { classNames } from './classNames';
import './Input.css';

type TextAreaProps = ComponentPropsWithRef<'textarea'> & { isInvalid?: boolean };

export function TextArea({ isInvalid = false, className, ...props }: TextAreaProps): JSX.Element {
  return (
    <textarea
      className={classNames('ui-input', 'ui-textarea', className)}
      aria-invalid={isInvalid || undefined}
      {...props}
    />
  );
}
