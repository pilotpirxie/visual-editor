import type { ComponentPropsWithRef, JSX, ReactNode } from 'react';
import { classNames } from './classNames';
import './Choice.css';

type SwitchProps = Omit<ComponentPropsWithRef<'input'>, 'type' | 'role'> & { label: ReactNode };

export function Switch({ label, className, ...props }: SwitchProps): JSX.Element {
  return (
    <label className={classNames('ui-switch', className)}>
      <span className="ui-field-label">{label}</span>
      <input type="checkbox" role="switch" {...props} />
    </label>
  );
}
