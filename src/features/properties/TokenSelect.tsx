import type { JSX } from 'react';
import type { EditKind } from '../../app/projectSlice';
import type { Token } from '../../app/types';
import { referencedTokenName, tokenReference } from '../../render/css';
import { isSafeCssValue } from '../../render/sanitize';
import { DraftInput } from './DraftInput';

type TokenSelectProps = {
  id: string;
  label: string;
  value: string;
  options: Token[];
  onChange(value: string, kind: EditKind): void;
};

const CUSTOM = 'custom';
const CUSTOM_VALUE_ERROR = 'Use a CSS value such as 2rem or 24px';

function selectedOption(value: string, options: Token[]): Token | null {
  const name = referencedTokenName(value);
  if (name === null) return null;
  return options.find((option) => option.name === name) ?? null;
}

export function TokenSelect({
  id,
  label,
  value,
  options,
  onChange,
}: TokenSelectProps): JSX.Element {
  const selected = selectedOption(value, options);

  function choose(optionName: string): void {
    if (optionName !== CUSTOM) {
      onChange(tokenReference(optionName), 'discrete');
      return;
    }
    if (selected !== null) onChange(selected.value, 'discrete');
  }

  return (
    <div className="ve-token-select">
      <label className="ve-control-label" htmlFor={id}>
        {label}
      </label>
      <select
        id={id}
        className="ve-input"
        value={selected === null ? CUSTOM : selected.name}
        onChange={(event) => choose(event.target.value)}
      >
        {options.map((option) => (
          <option key={option.name} value={option.name}>
            {option.label} ({option.value})
          </option>
        ))}
        <option value={CUSTOM}>Custom value</option>
      </select>
      {selected === null && (
        <DraftInput
          label={`${label}: custom value`}
          value={value}
          validate={(text) => (isSafeCssValue(text) ? null : CUSTOM_VALUE_ERROR)}
          onCommit={(text) => onChange(text, 'continuous')}
        />
      )}
    </div>
  );
}
