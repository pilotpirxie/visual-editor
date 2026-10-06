import type { JSX } from 'react';
import { useStore } from '../../app/store';
import type { Token } from '../../app/types';
import type { ControlProps } from './FieldControl';

const TOKEN_REFERENCE = /^var\((?<name>--[a-z0-9-]+)\)$/;
const SHORT_HEX = /^#(?<r>[0-9a-f])(?<g>[0-9a-f])(?<b>[0-9a-f])$/i;
const LONG_HEX = /^#[0-9a-f]{6}/i;
const FALLBACK_HEX = '#000000';

function tokenReference(token: Token): string {
  return `var(${token.name})`;
}

function toPickerHex(color: string): string {
  const short = SHORT_HEX.exec(color);
  if (short !== null && short.groups !== undefined) {
    const { r, g, b } = short.groups;
    return `#${r}${r}${g}${g}${b}${b}`;
  }
  const long = LONG_HEX.exec(color);
  if (long === null) return FALLBACK_HEX;
  return long[0];
}

function resolveColor(value: string, tokens: Record<string, Token>): string {
  const reference = TOKEN_REFERENCE.exec(value);
  const name = reference?.groups?.name;
  if (name === undefined) return value;
  const token = tokens[name];
  if (token === undefined) return FALLBACK_HEX;
  return token.value;
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
  const colorTokens = Object.values(tokens).filter((token) => token.group === 'color');
  const current = typeof value === 'string' ? value : '';
  const isCustom = !TOKEN_REFERENCE.test(current);

  return (
    <fieldset className="ve-color" aria-describedby={describedBy}>
      <legend className="ve-control-label">{field.label}</legend>
      <div className="ve-swatches">
        {colorTokens.map((token) => (
          <label key={token.name} className="ve-swatch" title={token.label}>
            <input
              type="radio"
              name={id}
              checked={current === tokenReference(token)}
              onChange={() => onChange(tokenReference(token), 'discrete')}
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
