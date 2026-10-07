import type { JSX } from 'react';
import type { EditKind } from '../../app/projectSlice';
import type { Token } from '../../app/types';
import { referencedTokenName, tokenReference } from '../../render/css';
import { isSafeCssValue } from '../../render/sanitize';
import { DraftInput, Field, Select } from '../../../packages/ui/src';

type TokenSelectProps = {
  id: string;
  label: string;
  value: string;
  options: Token[];
  layout?: 'stack' | 'inline';
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
  layout = 'stack',
  onChange,
}: TokenSelectProps): JSX.Element {
  const selected = selectedOption(value, options);
  const selectOptions = [];
  for (const option of options) {
    selectOptions.push({ value: option.name, label: `${option.label} (${option.value})` });
  }
  selectOptions.push({ value: CUSTOM, label: 'Custom value' });

  function choose(optionName: string): void {
    if (optionName !== CUSTOM) {
      onChange(tokenReference(optionName), 'discrete');
      return;
    }
    if (selected !== null) onChange(selected.value, 'discrete');
  }

  return (
    <div className="ve-token-select">
      <Field id={id} label={label} layout={layout}>
        <Select
          id={id}
          value={selected === null ? CUSTOM : selected.name}
          options={selectOptions}
          onChange={(event) => choose(event.target.value)}
        />
      </Field>
      {selected === null && (
        <DraftInput
          id={`${id}-custom`}
          label={`${label}: custom value`}
          value={value}
          validate={(text) => (isSafeCssValue(text) ? null : CUSTOM_VALUE_ERROR)}
          onCommit={(text) => onChange(text, 'continuous')}
        />
      )}
    </div>
  );
}
