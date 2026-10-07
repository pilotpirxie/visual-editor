import type { JSX } from 'react';
import { DEVICE_VIEWPORTS, type DeviceMode } from '../../app/editorSlice';
import { Select } from '../../../packages/ui/src';

const DEVICE_LABELS: Record<DeviceMode, string> = {
  responsive: 'Responsive',
  desktop: 'Desktop',
  tablet: 'Tablet',
  phone: 'Phone',
};

export function deviceOptionLabel(mode: DeviceMode): string {
  if (mode === 'responsive') return DEVICE_LABELS[mode];
  return `${DEVICE_LABELS[mode]} (${DEVICE_VIEWPORTS[mode].width} px)`;
}

type DeviceSelectProps = {
  id: string;
  value: DeviceMode;
  modes: readonly DeviceMode[];
  className?: string;
  onChange(mode: DeviceMode): void;
};

export function DeviceSelect({
  id,
  value,
  modes,
  className,
  onChange,
}: DeviceSelectProps): JSX.Element {
  const options = [];
  for (const mode of modes) options.push({ value: mode, label: deviceOptionLabel(mode) });
  return (
    <Select
      id={id}
      className={className}
      aria-label="Device"
      value={value}
      options={options}
      onChange={(event) => {
        const picked = modes.find((mode) => mode === event.target.value);
        if (picked !== undefined) onChange(picked);
      }}
    />
  );
}
