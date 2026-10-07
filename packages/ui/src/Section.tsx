import { useState, type JSX, type ReactNode, type SyntheticEvent } from 'react';
import { classNames } from './classNames';
import { Icon } from './Icon';
import './Section.css';

type SectionProps = {
  title: string;
  defaultOpen?: boolean;
  isOpen?: boolean;
  className?: string;
  onToggle?(isOpen: boolean): void;
  children: ReactNode;
};

export function Section({
  title,
  defaultOpen = true,
  isOpen,
  className,
  onToggle,
  children,
}: SectionProps): JSX.Element {
  const [isOwnOpen, setIsOwnOpen] = useState(defaultOpen);
  const isShownOpen = isOpen ?? isOwnOpen;

  function toggle(event: SyntheticEvent<HTMLDetailsElement>): void {
    const isNowOpen = event.currentTarget.open;
    if (isNowOpen === isShownOpen) return;
    if (isOpen === undefined) setIsOwnOpen(isNowOpen);
    onToggle?.(isNowOpen);
  }

  return (
    <details className={classNames('ui-section', className)} open={isShownOpen} onToggle={toggle}>
      <summary className="ui-section-summary">
        <Icon name="chevron-down" />
        <h3 className="ui-section-title">{title}</h3>
      </summary>
      <div className="ui-section-body">{children}</div>
    </details>
  );
}
