import { useMemo, useRef, useState, type JSX } from 'react';
import {
  DEFAULT_ICON_SET,
  iconSvg,
  parseIconRef,
  resolveIcon,
  searchIcons,
} from '../../render/icons';
import { Icon } from '../editor/Icon';
import type { ControlProps } from './FieldControl';

const MAX_RESULTS = 96;

function iconMarkup(ref: string): string {
  const icon = resolveIcon(ref);
  if (icon === null) return '';
  return iconSvg(icon);
}

export function IconField({ field, value, id, describedBy, onChange }: ControlProps): JSX.Element {
  const [query, setQuery] = useState<string | null>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const ref = typeof value === 'string' ? value : '';
  const selected = parseIconRef(ref);
  const isPickerOpen = query !== null;
  const matches = useMemo(() => {
    if (query === null) return [];
    return searchIcons(DEFAULT_ICON_SET, query);
  }, [query]);
  const shown = matches.slice(0, MAX_RESULTS);
  const labelId = `${id}-label`;

  function closePicker(): void {
    setQuery(null);
    toggleRef.current?.focus();
  }

  function pick(name: string): void {
    onChange(`${DEFAULT_ICON_SET}:${name}`, 'discrete');
    closePicker();
  }

  return (
    <>
      <span className="ve-control-label" id={labelId}>
        {field.label}
      </span>
      <div className="ve-icon-field">
        <span className="ve-icon-preview" dangerouslySetInnerHTML={{ __html: iconMarkup(ref) }} />
        <span className="ve-icon-name">{ref === '' ? 'No icon' : selected.name}</span>
        <button
          ref={toggleRef}
          id={id}
          type="button"
          className="ve-button ve-button--outline"
          aria-labelledby={`${labelId} ${id}`}
          aria-expanded={isPickerOpen}
          aria-describedby={describedBy}
          onClick={() => setQuery(isPickerOpen ? null : '')}
        >
          {isPickerOpen ? 'Close' : 'Change'}
        </button>
      </div>
      {isPickerOpen && (
        <div className="ve-icon-picker">
          <label className="ve-search">
            <Icon name="search" />
            <input
              type="search"
              placeholder="Search icons"
              aria-label="Search icons"
              value={query}
              autoFocus
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key !== 'Escape') return;
                event.preventDefault();
                closePicker();
              }}
            />
          </label>
          <div className="ve-icon-grid" role="group" aria-labelledby={labelId}>
            {shown.map((name) => (
              <button
                key={name}
                type="button"
                className="ve-icon-option"
                title={name}
                aria-label={name}
                aria-pressed={selected.set === DEFAULT_ICON_SET && selected.name === name}
                onClick={() => pick(name)}
                dangerouslySetInnerHTML={{ __html: iconMarkup(`${DEFAULT_ICON_SET}:${name}`) }}
              />
            ))}
          </div>
          <p className="ve-control-help" aria-live="polite">
            {matches.length > shown.length
              ? `Showing ${shown.length} of ${matches.length} icons. Type to narrow the list.`
              : `${matches.length} icons`}
          </p>
        </div>
      )}
    </>
  );
}
