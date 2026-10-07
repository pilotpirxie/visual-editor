import type { ComponentPropsWithRef, JSX } from 'react';
import { classNames } from './classNames';
import { Icon } from './Icon';
import { useTooltip } from './Tooltip';
import './Button.css';

type IconButtonProps = Omit<
  ComponentPropsWithRef<'button'>,
  'children' | 'onPointerEnter' | 'onPointerLeave' | 'onFocus' | 'onBlur'
> & {
  label: string;
  icon: string;
  isPressed?: boolean;
  shortcut?: string;
  hint?: string;
};

export function IconButton({
  label,
  icon,
  isPressed,
  shortcut,
  hint,
  className,
  type = 'button',
  onPointerDown,
  ...props
}: IconButtonProps): JSX.Element {
  const { triggerProps, tooltip } = useTooltip({
    text: hint ?? label,
    shortcut,
    isDescription: hint !== undefined,
  });
  return (
    <>
      <button
        type={type}
        className={classNames('ui-icon-button', className)}
        aria-label={label}
        aria-pressed={isPressed}
        {...triggerProps}
        onPointerDown={(event) => {
          triggerProps.onPointerDown();
          onPointerDown?.(event);
        }}
        {...props}
      >
        <Icon name={icon} />
      </button>
      {tooltip}
    </>
  );
}
