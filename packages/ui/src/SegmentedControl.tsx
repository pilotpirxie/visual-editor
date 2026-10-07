import type { JSX } from 'react';
import { classNames } from './classNames';
import { hasIcon, Icon } from './Icon';
import { TooltipLabel } from './Tooltip';
import './Choice.css';

export type SegmentOption = { value: string; label: string; icon?: string };

type SegmentedControlProps = {
  legend: string;
  name: string;
  options: readonly SegmentOption[];
  value: string;
  isLegendHidden?: boolean;
  describedBy?: string;
  className?: string;
  onChange(value: string): void;
};

function SegmentLabel({ label, icon }: { label: string; icon: string | undefined }): JSX.Element {
  if (icon === undefined || !hasIcon(icon)) return <>{label}</>;
  return (
    <>
      <Icon name={icon} />
      <span className="ve-visually-hidden">{label}</span>
    </>
  );
}

export function SegmentedControl({
  legend,
  name,
  options,
  value,
  isLegendHidden = false,
  describedBy,
  className,
  onChange,
}: SegmentedControlProps): JSX.Element {
  return (
    <fieldset className={classNames('ui-segmented', className)} aria-describedby={describedBy}>
      <legend className={isLegendHidden ? 've-visually-hidden' : 'ui-legend'}>{legend}</legend>
      <div className="ui-segmented-options">
        {options.map((option) => (
          <TooltipLabel key={option.value} className="ui-segment" text={option.label}>
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
            />
            <SegmentLabel label={option.label} icon={option.icon} />
          </TooltipLabel>
        ))}
      </div>
    </fieldset>
  );
}
