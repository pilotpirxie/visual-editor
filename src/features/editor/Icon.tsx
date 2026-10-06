import type { JSX } from 'react';
import { ICONS } from '../../render/icons';

export function Icon({ name }: { name: string }): JSX.Element {
  return (
    <svg
      className="ve-icon"
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      dangerouslySetInnerHTML={{ __html: ICONS[name] ?? '' }}
    />
  );
}
