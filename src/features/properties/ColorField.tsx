import type { JSX } from 'react';
import { useStore } from '../../app/store';
import { referencedTokenName, tokenReference } from '../../render/css';
import { resolveColor, toPickerHex } from '../design-system/colors';
import type { ControlProps } from './FieldControl';

export function ColorField({
  field,
  value,
  id,
  describedBy,
  isInvalid,
  onChange,
}: ControlProps): JSX.Element {
  const tokens = useStore((state) => state.project.designSystem.tokens);
  const colorTokens = Object.values(tokens).filter((token) => token.group === 'color');
  const current = typeof value === 'string' ? value : '';
  const isCustom = referencedTokenName(current) === null;

  return (
    <fieldset className="ve-color" aria-describedby={describedBy}>
      <legend className="ve-control-label">{field.label}</legend>
      <div className="ve-swatches">
        {colorTokens.map((token) => (
          <label key={token.name} className="ve-swatch" title={token.label}>
            <input
              type="radio"
              name={id}
              checked={current === tokenReference(token.name)}
              onChange={() => onChange(tokenReference(token.name), 'discrete')}
            />
            <span className="ve-swatch-color" style={{ background: token.value }} />
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
            className="ve-input"
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
