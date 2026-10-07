import type { ComponentPropsWithRef, JSX } from 'react';
import { classNames } from './classNames';
import { Icon } from './Icon';
import './Button.css';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

type ButtonProps = ComponentPropsWithRef<'button'> & { variant?: ButtonVariant; icon?: string };

export function buttonClassName(variant: ButtonVariant, className?: string): string {
  return classNames('ui-button', `ui-button--${variant}`, className);
}

export function Button({
  variant = 'secondary',
  icon,
  className,
  type = 'button',
  children,
  ...props
}: ButtonProps): JSX.Element {
  return (
    <button type={type} className={buttonClassName(variant, className)} {...props}>
      {icon !== undefined && <Icon name={icon} />}
      {children}
    </button>
  );
}
