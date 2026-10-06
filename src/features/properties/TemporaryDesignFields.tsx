import type { JSX } from 'react';
import { tokenSet } from '../../app/projectSlice';
import { dispatch, useStore } from '../../app/store';

const FALLBACK_PRIMARY = '#000000';

const HEADING_FONTS = [
  { label: 'Sans serif', value: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif' },
  { label: 'Serif', value: 'Georgia, "Times New Roman", serif' },
  { label: 'Monospace', value: 'ui-monospace, "SF Mono", Menlo, Consolas, monospace' },
];

export function TemporaryDesignFields(): JSX.Element {
  const primary = useStore((state) => state.project.designSystem.tokens['--color-primary']?.value);
  const headingFont = useStore(
    (state) => state.project.designSystem.tokens['--font-heading']?.value ?? HEADING_FONTS[0].value,
  );

  return (
    <section className="ve-properties-section">
      <h2 className="ve-properties-title">Design</h2>
      <p className="ve-muted">Applies to every block on every page.</p>
      <label className="ve-field">
        <span>Primary color</span>
        <input
          type="color"
          value={primary ?? FALLBACK_PRIMARY}
          onChange={(event) =>
            dispatch(tokenSet({ name: '--color-primary', value: event.target.value }, 'continuous'))
          }
        />
      </label>
      <label className="ve-field">
        <span>Heading font</span>
        <select
          value={headingFont}
          onChange={(event) =>
            dispatch(tokenSet({ name: '--font-heading', value: event.target.value }, 'discrete'))
          }
        >
          {HEADING_FONTS.map(({ label, value }) => (
            <option key={label} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
    </section>
  );
}
