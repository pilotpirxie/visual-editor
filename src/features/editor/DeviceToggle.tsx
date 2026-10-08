import type { JSX } from 'react';
import { DEVICE_VIEWPORTS, type DeviceMode } from '../../app/editorSlice';
import { SegmentedControl } from '../../../packages/ui/src';

const DEVICE_LABELS: Record<DeviceMode, string> = {
  responsive: 'Responsive',
  desktop: 'Desktop',
  tablet: 'Tablet',
  phone: 'Phone',
};

const DEVICE_ICONS: Record<DeviceMode, string> = {
  responsive: 'move-horizontal',
  desktop: 'monitor',
  tablet: 'tablet',
  phone: 'smartphone',
};

export function deviceOptionLabel(mode: DeviceMode): string {
  if (mode === 'responsive') return DEVICE_LABELS[mode];
  return `${DEVICE_LABELS[mode]} (${DEVICE_VIEWPORTS[mode].width} px)`;
}

type DeviceToggleProps<Mode extends DeviceMode> = {
  name: string;
  value: Mode;
  modes: readonly Mode[];
  className?: string;
  onChange(mode: Mode): void;
};

export function DeviceToggle<Mode extends DeviceMode>({
  name,
  value,
  modes,
  className,
  onChange,
}: DeviceToggleProps<Mode>): JSX.Element {
  const options = [];
  for (const mode of modes) {
    options.push({ value: mode, label: deviceOptionLabel(mode), icon: DEVICE_ICONS[mode] });
  }
  return (
    <SegmentedControl
      legend="Device"
      isLegendHidden
      name={name}
      className={className}
      value={value}
      options={options}
      onChange={(picked) => {
        const mode = modes.find((each) => each === picked);
        if (mode !== undefined) onChange(mode);
      }}
    />
  );
}
