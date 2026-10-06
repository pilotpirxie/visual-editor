import { useEffect, useRef, useState, type JSX } from 'react';
import { describeError } from '../../app/errors';
import { fontSet } from '../../app/projectSlice';
import { dispatch, useStore } from '../../app/store';
import type { FontRole, FontSelection } from '../../app/types';
import { fontStack, previewFontHref, SYSTEM_FONT_STACKS } from '../../render/fonts';
import { Icon } from '../editor/Icon';
import { loadFontList, searchFonts, type FontCategory, type FontFamily } from './fontList';

type FontListState =
  | { status: 'loading' }
  | { status: 'ready'; families: FontFamily[] }
  | { status: 'failed'; message: string };

const PAGE_SIZE = 40;
const REGULAR_WEIGHT = 400;
const DEFAULT_WEIGHTS = [400, 700];
const PREVIEW_MARGIN = '200px';

const CATEGORY_OPTIONS: { value: FontCategory; label: string }[] = [
  { value: 'sans-serif', label: 'Sans serif' },
  { value: 'serif', label: 'Serif' },
  { value: 'display', label: 'Display' },
  { value: 'handwriting', label: 'Handwriting' },
  { value: 'monospace', label: 'Monospace' },
];

function previewWeight(family: FontFamily): number {
  if (family.weights.includes(REGULAR_WEIGHT)) return REGULAR_WEIGHT;
  return family.weights[0];
}

function defaultWeights(family: FontFamily): number[] {
  const weights = DEFAULT_WEIGHTS.filter((weight) => family.weights.includes(weight));
  if (weights.length > 0) return weights;
  return [previewWeight(family)];
}

function loadPreviewFont(doc: Document, family: string, weight: number): void {
  for (const link of doc.head.querySelectorAll('link[data-font-preview]')) {
    if (link.getAttribute('data-font-preview') === family) return;
  }
  const link = doc.createElement('link');
  link.rel = 'stylesheet';
  link.href = previewFontHref(family, weight);
  link.setAttribute('data-font-preview', family);
  doc.head.append(link);
}

function useFontList(): FontListState {
  const [state, setState] = useState<FontListState>({ status: 'loading' });
  useEffect(() => {
    let isCancelled = false;
    async function load(): Promise<void> {
      try {
        const families = await loadFontList();
        if (!isCancelled) setState({ status: 'ready', families });
      } catch (error) {
        console.error('Font picker: the font list did not load', error);
        if (!isCancelled) setState({ status: 'failed', message: describeError(error) });
      }
    }
    void load();
    return () => {
      isCancelled = true;
    };
  }, []);
  return state;
}

function chooseFamily(role: FontRole, family: FontFamily): void {
  dispatch(
    fontSet({
      role,
      selection: { family: family.family, weights: defaultWeights(family) },
      stack: fontStack(family.family, family.category),
    }),
  );
}

function useFontPreviews(list: HTMLElement | null, families: FontFamily[]): void {
  useEffect(() => {
    if (list === null) return;
    const doc = list.ownerDocument;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting || !(entry.target instanceof HTMLElement)) continue;
          const { fontFamily, fontWeight } = entry.target.dataset;
          if (fontFamily === undefined) continue;
          loadPreviewFont(doc, fontFamily, Number(fontWeight));
          observer.unobserve(entry.target);
        }
      },
      { root: list, rootMargin: PREVIEW_MARGIN },
    );
    for (const row of list.querySelectorAll('[data-font-family]')) observer.observe(row);
    return () => observer.disconnect();
  }, [list, families]);
}

function FontBrowser({
  role,
  label,
  families,
  current,
  onDone,
}: {
  role: FontRole;
  label: string;
  families: FontFamily[];
  current: string | null;
  onDone(): void;
}): JSX.Element {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<FontCategory | null>(null);
  const [shownCount, setShownCount] = useState(PAGE_SIZE);
  const [list, setList] = useState<HTMLUListElement | null>(null);
  const matches = searchFonts(families, query, category);
  const shown = matches.slice(0, shownCount);
  useFontPreviews(list, shown);

  return (
    <div className="ve-font-browser">
      <div className="ve-font-filters">
        <label className="ve-search">
          <Icon name="search" />
          <input
            type="search"
            placeholder="Search fonts"
            aria-label={`Search fonts for ${label.toLowerCase()}`}
            value={query}
            autoFocus
            onChange={(event) => {
              setQuery(event.target.value);
              setShownCount(PAGE_SIZE);
            }}
            onKeyDown={(event) => {
              if (event.key !== 'Escape') return;
              event.preventDefault();
              event.stopPropagation();
              onDone();
            }}
          />
        </label>
        <select
          className="ve-input"
          aria-label="Font category"
          value={category ?? ''}
          onChange={(event) => {
            const picked = CATEGORY_OPTIONS.find(({ value }) => value === event.target.value);
            setCategory(picked === undefined ? null : picked.value);
            setShownCount(PAGE_SIZE);
          }}
        >
          <option value="">All categories</option>
          {CATEGORY_OPTIONS.map(({ value, label: categoryLabel }) => (
            <option key={value} value={value}>
              {categoryLabel}
            </option>
          ))}
        </select>
      </div>
      <ul className="ve-font-list" ref={setList} aria-label={`Fonts for ${label.toLowerCase()}`}>
        {shown.map((family) => (
          <li key={family.family}>
            <button
              type="button"
              className="ve-font-option"
              data-font-family={family.family}
              data-font-weight={previewWeight(family)}
              aria-pressed={family.family === current}
              style={{ fontFamily: fontStack(family.family, family.category) }}
              onClick={() => {
                chooseFamily(role, family);
                onDone();
              }}
            >
              {family.family}
            </button>
          </li>
        ))}
      </ul>
      {matches.length === 0 && <p className="ve-muted">No fonts match “{query.trim()}”.</p>}
      {matches.length > shown.length && (
        <button
          type="button"
          className="ve-button ve-button--outline"
          onClick={() => setShownCount(shownCount + PAGE_SIZE)}
        >
          Show more fonts
        </button>
      )}
    </div>
  );
}

function WeightChoices({
  role,
  selection,
  family,
}: {
  role: FontRole;
  selection: FontSelection;
  family: FontFamily;
}): JSX.Element {
  function toggle(weight: number, isChecked: boolean): void {
    const weights = isChecked
      ? [...selection.weights, weight]
      : selection.weights.filter((kept) => kept !== weight);
    dispatch(
      fontSet({
        role,
        selection: { family: selection.family, weights },
        stack: fontStack(family.family, family.category),
      }),
    );
  }

  return (
    <fieldset className="ve-font-weights">
      <legend className="ve-control-label">Weights to load</legend>
      <div className="ve-font-weight-options">
        {family.weights.map((weight) => {
          const isChecked = selection.weights.includes(weight);
          const isLastWeight = isChecked && selection.weights.length === 1;
          return (
            <label key={weight} className="ve-font-weight">
              <input
                type="checkbox"
                checked={isChecked}
                disabled={isLastWeight}
                onChange={(event) => toggle(weight, event.target.checked)}
              />
              {weight}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

export function FontPicker({ role, label }: { role: FontRole; label: string }): JSX.Element {
  const selection = useStore((state) =>
    state.project.designSystem.fonts.find((font) => font.role === role),
  );
  const fontList = useFontList();
  const [isBrowsing, setIsBrowsing] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const families = fontList.status === 'ready' ? fontList.families : [];
  const family =
    selection === undefined ? undefined : families.find((item) => item.family === selection.family);

  useEffect(() => {
    if (family === undefined) return;
    loadPreviewFont(document, family.family, previewWeight(family));
  }, [family]);

  function closeBrowser(): void {
    setIsBrowsing(false);
    toggleRef.current?.focus();
  }

  function useSystemFont(): void {
    dispatch(fontSet({ role, selection: null, stack: SYSTEM_FONT_STACKS[role] }));
  }

  return (
    <div className="ve-font-picker" data-font-role={role}>
      <div className="ve-token-row">
        <span className="ve-control-label">{label}</span>
        <div className="ve-token-inputs">
          <span
            className="ve-font-current"
            style={
              family === undefined
                ? undefined
                : { fontFamily: fontStack(family.family, family.category) }
            }
          >
            {selection === undefined ? 'System font' : selection.family}
          </span>
          <button
            ref={toggleRef}
            type="button"
            className="ve-button ve-button--outline"
            aria-expanded={isBrowsing}
            aria-label={
              isBrowsing ? `Close ${label.toLowerCase()} list` : `Change ${label.toLowerCase()}`
            }
            disabled={fontList.status !== 'ready'}
            onClick={() => setIsBrowsing(!isBrowsing)}
          >
            {isBrowsing ? 'Close' : 'Change'}
          </button>
          {selection !== undefined && (
            <button type="button" className="ve-button" onClick={useSystemFont}>
              Use system font
            </button>
          )}
        </div>
      </div>
      {fontList.status === 'failed' && (
        <p className="ve-control-error" role="alert">
          {fontList.message}
        </p>
      )}
      {selection !== undefined && family !== undefined && (
        <WeightChoices role={role} selection={selection} family={family} />
      )}
      {isBrowsing && (
        <FontBrowser
          role={role}
          label={label}
          families={families}
          current={selection?.family ?? null}
          onDone={closeBrowser}
        />
      )}
    </div>
  );
}
