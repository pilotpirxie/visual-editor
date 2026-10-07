import type { JSX } from 'react';
import { isThemeToken } from '../../app/sectionThemes';
import { useStore } from '../../app/store';
import type { Token } from '../../app/types';
import { referencedTokenName, tokenReference } from '../../render/css';
import { resolveColor, toPickerHex } from '../design-system/colors';
import type { ControlProps } from './FieldControl';

function swatchTokens(tokens: Record<string, Token>, current: string): Token[] {
  const currentName = referencedTokenName(current);
  const swatches: Token[] = [];
  for (const token of Object.values(tokens)) {
    if (token.group !== 'color') continue;
    if (!isThemeToken(token.name) || token.name === currentName) swatches.push(token);
  }
  return swatches;
}

export function ColorField({
  field,
  value,
  id,
  describedBy,
  isInvalid,
  onChange,
}: ControlProps): JSX.Element {
  const tokens = useStore((state) => state.project.designSystem.tokens);
  const current = typeof value === 'string' ? value : '';
  const colorTokens = swatchTokens(tokens, current);
  const isCustom = referencedTokenName(current) === null;

  return (
    <fieldset className="ve-color" aria-describedby={describedBy}>
      <legend className="ui-field-label">{field.label}</legend>
      <div className="ve-swatches">
        {colorTokens.map((token) => (
          <label key={token.name} className="ve-swatch" title={token.label}>
            <input
              type="radio"
              name={id}
              checked={current === tokenReference(token.name)}
              onChange={() => onChange(tokenReference(token.name), 'discrete')}
            />
            <span
              className="ve-swatch-color"
              style={{ background: resolveColor(token.value, tokens) }}
            />
            <span className="ve-visually-hidden">{token.label}</span>
          </label>
        ))}
        <label className="ve-swatch ve-swatch--custom" title="Custom color">
          <input
            type="radio"
            name={id}
            checked={isCustom}
            onChange={() => onChange(toPickerHex(resolveColor(current, tokens)), 'discrete')}
          />
          <span className="ve-swatch-color" />
          <span className="ve-visually-hidden">Custom color</span>
        </label>
      </div>
      {isCustom && (
        <div className="ve-color-custom">
          <input
            type="color"
            aria-label={`${field.label}: pick a custom color`}
            value={toPickerHex(current)}
            onChange={(event) => onChange(event.target.value, 'continuous')}
          />
          <input
            className="ui-input"
            type="text"
            aria-label={`${field.label}: hex value`}
            spellCheck={false}
            value={current}
            aria-invalid={isInvalid}
            onChange={(event) => onChange(event.target.value.trim(), 'continuous')}
          />
        </div>
      )}
    </fieldset>
  );
}
