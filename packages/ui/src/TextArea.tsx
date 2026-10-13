import type { ComponentPropsWithRef, JSX, KeyboardEvent } from 'react';
import { classNames } from './classNames';
import './Input.css';

type TextAreaProps = ComponentPropsWithRef<'textarea'> & { isInvalid?: boolean };

const TOUCH_KEYBOARD_QUERY = '(pointer: coarse)';

export function submitOnEnter(event: KeyboardEvent<HTMLTextAreaElement>): void {
  if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) return;
  if (window.matchMedia(TOUCH_KEYBOARD_QUERY).matches) return;
  event.preventDefault();
  event.currentTarget.form?.requestSubmit();
}

export function TextArea({ isInvalid = false, className, ...props }: TextAreaProps): JSX.Element {
  return (
    <textarea
      className={classNames('ui-input', 'ui-textarea', className)}
      aria-invalid={isInvalid || undefined}
      {...props}
    />
  );
}
