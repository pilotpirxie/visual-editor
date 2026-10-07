import type { ComponentPropsWithRef, JSX, ReactNode } from 'react';
import { classNames } from './classNames';
import './Choice.css';

type CheckboxProps = Omit<ComponentPropsWithRef<'input'>, 'type'> & { label: ReactNode };

export function Checkbox({ label, className, ...props }: CheckboxProps): JSX.Element {
  return (
    <label className={classNames('ui-check', className)}>
      <input type="checkbox" {...props} />
      <span>{label}</span>
    </label>
  );
}
