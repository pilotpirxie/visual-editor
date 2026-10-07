import { useRef, useState, type JSX } from 'react';
import { useStore } from '../../app/store';
import { iconSetInfo } from '../../../packages/icon-data/src/sets';
import {
  iconSetData,
  iconSvg,
  isSemanticIcon,
  parseIconRef,
  resolveIcon,
  searchIcons,
} from '../../render/icons';
import { Icon } from '../editor/Icon';
import { allowedIconSets } from '../icons/iconSets';
import { isIconSetLoaded, loadIconSet } from '../icons/loadIconSet';
import type { ControlProps } from './FieldControl';

const MAX_RESULTS = 96;
const DEFAULT_FILTER = 'default';
const ALL_SETS = 'all';
const ANY_STYLE = 'any';

type IconMatch = { set: string; name: string };

type LoadState = { status: 'idle' | 'loading' } | { status: 'failed'; message: string };

function iconMarkup(ref: string, defaultSet: string): string {
  const icon = resolveIcon(ref, defaultSet);
  if (icon === null) return '';
  return iconSvg(icon);
}

function setsToSearch(filter: string, defaultSet: string, allowedIds: string[]): string[] {
  if (filter === DEFAULT_FILTER) return allowedIds.includes(defaultSet) ? [defaultSet] : [];
  if (filter !== ALL_SETS) return [filter];
  const sets: string[] = [];
  for (const id of allowedIds) {
    const isOnDemand = iconSetInfo(id)?.isOnDemand === true;
    if (!isOnDemand || isIconSetLoaded(id)) sets.push(id);
  }
  return sets;
}

function searchSets(sets: string[], query: string, style: string): IconMatch[] {
  const matches: IconMatch[] = [];
  const styleFilter = style === ANY_STYLE ? null : style;
  for (const set of sets) {
    for (const name of searchIcons(set, query, styleFilter)) matches.push({ set, name });
  }
  return matches;
}

function refLabel(ref: string): string {
  if (ref === '') return 'No icon';
  const { set, name } = parseIconRef(ref);
  if (set === null) return `${name} · follows the default set`;
  return `${name} · ${iconSetInfo(set)?.label ?? set}`;
}

export function IconField({ field, value, id, describedBy, onChange }: ControlProps): JSX.Element {
  const defaultSet = useStore((state) => state.project.designSystem.iconSet);
  const [query, setQuery] = useState<string | null>(null);
  const [filter, setFilter] = useState(DEFAULT_FILTER);
  const [style, setStyle] = useState(ANY_STYLE);
  const [loadState, setLoadState] = useState<LoadState>({ status: 'idle' });
  const toggleRef = useRef<HTMLButtonElement>(null);
  const ref = typeof value === 'string' ? value : '';
  const allowed = allowedIconSets(field);
  const allowedIds = allowed.map((info) => info.id);
  const sets = setsToSearch(filter, defaultSet, allowedIds);
  const isPickerOpen = query !== null;
  const labelId = `${id}-label`;
  const singleSet = sets.length === 1 ? sets[0] : undefined;
  const styles = singleSet === undefined ? [] : (iconSetData(singleSet)?.styles ?? []);
  const searchStyle = styles.length > 0 ? style : ANY_STYLE;
  const matches = query === null ? [] : searchSets(sets, query, searchStyle);
  const shown = matches.slice(0, MAX_RESULTS);
  const canUseDefault =
    typeof field.default === 'string' && isSemanticIcon(field.default) && ref !== field.default;

  async function requestSets(nextFilter: string): Promise<void> {
    const missing = setsToLoad(nextFilter, defaultSet, allowedIds);
    if (missing.length === 0) return;
    setLoadState({ status: 'loading' });
    try {
      await Promise.all(missing.map((set) => loadIconSet(set)));
    } catch (error) {
      console.error(`Could not load the icon sets ${missing.join(', ')}`, error);
      setLoadState({ status: 'failed', message: 'This icon set could not be loaded.' });
      return;
    }
    setLoadState({ status: 'idle' });
  }

  function closePicker(): void {
    setQuery(null);
    toggleRef.current?.focus();
  }

  function pick(match: IconMatch): void {
    onChange(`${match.set}:${match.name}`, 'discrete');
    closePicker();
  }

  return (
    <>
      <span className="ve-control-label" id={labelId}>
        {field.label}
      </span>
      <div className="ve-icon-field">
        <span
          className="ve-icon-preview"
          dangerouslySetInnerHTML={{ __html: iconMarkup(ref, defaultSet) }}
        />
        <span className="ve-icon-name">{refLabel(ref)}</span>
        <button
          ref={toggleRef}
          id={id}
          type="button"
          className="ve-button ve-button--outline"
          aria-labelledby={`${labelId} ${id}`}
          aria-expanded={isPickerOpen}
          aria-describedby={describedBy}
          onClick={() => {
            if (isPickerOpen) {
              setQuery(null);
              return;
            }
            setQuery('');
            void requestSets(filter);
          }}
        >
          {isPickerOpen ? 'Close' : 'Change'}
        </button>
        {canUseDefault && typeof field.default === 'string' && (
          <button
            type="button"
            className="ve-button"
            onClick={() => onChange(field.default, 'discrete')}
          >
            Use default
          </button>
        )}
      </div>
      {isPickerOpen && (
        <div className="ve-icon-picker">
          <div className="ve-icon-filters">
            <select
              className="ve-input"
              aria-label="Icon set"
              value={filter}
              onChange={(event) => {
                setFilter(event.target.value);
                setStyle(ANY_STYLE);
                void requestSets(event.target.value);
              }}
            >
              {allowedIds.includes(defaultSet) && (
                <option value={DEFAULT_FILTER}>
                  Default set ({iconSetInfo(defaultSet)?.label ?? defaultSet})
                </option>
              )}
              {allowed.map((info) => (
                <option key={info.id} value={info.id}>
                  {info.label}
                </option>
              ))}
              <option value={ALL_SETS}>All sets</option>
            </select>
            {styles.length > 0 && (
              <select
                className="ve-input"
                aria-label="Icon style"
                value={style}
                onChange={(event) => setStyle(event.target.value)}
              >
                <option value={ANY_STYLE}>All styles</option>
                {styles.map((option) => (
                  <option key={option.suffix} value={option.suffix}>
                    {option.label}
                  </option>
                ))}
              </select>
            )}
          </div>
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
          {loadState.status === 'failed' && (
            <p className="ve-control-error" role="alert">
              {loadState.message}
            </p>
          )}
          <div className="ve-icon-grid" role="group" aria-labelledby={labelId}>
            {shown.map((match) => {
              const matchRef = `${match.set}:${match.name}`;
              const setLabel = iconSetInfo(match.set)?.label ?? match.set;
              return (
                <button
                  key={matchRef}
                  type="button"
                  className="ve-icon-option"
                  title={sets.length > 1 ? `${match.name} (${setLabel})` : match.name}
                  aria-label={sets.length > 1 ? `${match.name}, ${setLabel}` : match.name}
                  aria-pressed={ref === matchRef}
                  onClick={() => pick(match)}
                  dangerouslySetInnerHTML={{ __html: iconMarkup(matchRef, defaultSet) }}
                />
              );
            })}
          </div>
          <p className="ve-control-help" aria-live="polite">
            {loadState.status === 'loading' && 'Loading icons…'}
            {loadState.status !== 'loading' &&
              (matches.length > shown.length
                ? `Showing ${shown.length} of ${matches.length} icons. Type to narrow the list.`
                : `${matches.length} icons`)}
          </p>
        </div>
      )}
    </>
  );
}

function setsToLoad(filter: string, defaultSet: string, allowedIds: string[]): string[] {
  const wanted =
    filter === ALL_SETS
      ? allowedIds.filter((id) => iconSetInfo(id)?.isOnDemand !== true)
      : setsToSearch(filter, defaultSet, allowedIds);
  return wanted.filter((set) => !isIconSetLoaded(set));
}
