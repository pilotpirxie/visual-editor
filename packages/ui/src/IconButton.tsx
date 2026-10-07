import type { ComponentPropsWithRef, JSX } from 'react';
import { classNames } from './classNames';
import { Icon } from './Icon';
import './Button.css';

type IconButtonProps = Omit<ComponentPropsWithRef<'button'>, 'children'> & {
  label: string;
  icon: string;
  isPressed?: boolean;
};

export function IconButton({
  label,
  icon,
  isPressed,
  className,
  type = 'button',
  ...props
}: IconButtonProps): JSX.Element {
  return (
    <button
      type={type}
      className={classNames('ui-icon-button', className)}
      aria-label={label}
      aria-pressed={isPressed}
      title={label}
      {...props}
    >
      <Icon name={icon} />
    </button>
  );
}
