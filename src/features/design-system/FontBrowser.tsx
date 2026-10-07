import { useEffect, useState, type JSX } from 'react';
import { describeError } from '../../app/errors';
import { fontSet } from '../../app/projectSlice';
import { dispatch } from '../../app/store';
import type { FontRole } from '../../app/types';
import { fontStack, previewFontHref, SYSTEM_FONT_STACKS } from '../../render/fonts';
import { loadFontList, searchFonts, type FontCategory, type FontFamily } from './fontList';
import { Button, SearchInput, Select } from '../../../packages/ui/src';

export type FontListState =
  | { status: 'loading' }
  | { status: 'ready'; families: FontFamily[] }
  | { status: 'failed'; message: string };

const PAGE_SIZE = 40;
const REGULAR_WEIGHT = 400;
const PREVIEW_MARGIN = '200px';

const CATEGORY_OPTIONS: { value: FontCategory; label: string }[] = [
  { value: 'sans-serif', label: 'Sans serif' },
  { value: 'serif', label: 'Serif' },
  { value: 'display', label: 'Display' },
  { value: 'handwriting', label: 'Handwriting' },
  { value: 'monospace', label: 'Monospace' },
];

export function previewWeight(family: FontFamily): number {
  if (family.weights.includes(REGULAR_WEIGHT)) return REGULAR_WEIGHT;
  return family.weights[0];
}

export function loadPreviewFont(doc: Document, family: string, weight: number): void {
  for (const link of doc.head.querySelectorAll('link[data-font-preview]')) {
    if (link.getAttribute('data-font-preview') === family) return;
  }
  const link = doc.createElement('link');
  link.rel = 'stylesheet';
  link.href = previewFontHref(family, weight);
  link.setAttribute('data-font-preview', family);
  doc.head.append(link);
}

export function useFontList(): FontListState {
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

function chooseFamily(role: FontRole, family: FontFamily | null): void {
  if (family === null) {
    dispatch(fontSet({ role, family: null, stack: SYSTEM_FONT_STACKS[role] }));
    return;
  }
  dispatch(
    fontSet({
      role,
      family: family.family,
      availableWeights: family.weights,
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

export function FontBrowser({
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

  const categoryOptions = [{ value: '', label: 'All categories' }, ...CATEGORY_OPTIONS];

  return (
    <div className="ve-font-browser">
      <div className="ve-font-filters">
        <SearchInput
          label={`Search fonts for ${label.toLowerCase()}`}
          placeholder="Search fonts"
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
        <Select
          aria-label="Font category"
          value={category ?? ''}
          options={categoryOptions}
          onChange={(event) => {
            const picked = CATEGORY_OPTIONS.find(({ value }) => value === event.target.value);
            setCategory(picked === undefined ? null : picked.value);
            setShownCount(PAGE_SIZE);
          }}
        />
      </div>
      <ul className="ve-font-list" ref={setList} aria-label={`Fonts for ${label.toLowerCase()}`}>
        <li>
          <button
            type="button"
            className="ve-font-option"
            aria-pressed={current === null}
            onClick={() => {
              chooseFamily(role, null);
              onDone();
            }}
          >
            System font
          </button>
        </li>
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
      {matches.length === 0 && <p className="ui-muted">No fonts match “{query.trim()}”.</p>}
      {matches.length > shown.length && (
        <Button onClick={() => setShownCount(shownCount + PAGE_SIZE)}>Show more fonts</Button>
      )}
    </div>
  );
}
