import type { JSX } from 'react';
import type { EditKind } from '../../app/projectSlice';
import type { Token, TokenGroup } from '../../app/types';
import { isSafeCssValue } from '../../render/sanitize';
import { TokenSelect } from '../properties/TokenSelect';
import { resolveColor, toPickerHex } from './colors';
import { DraftInput, Field } from '../../../packages/ui/src';

type TokenControlProps = {
  token: Token;
  tokens: Record<string, Token>;
  onChange(value: string, kind: EditKind): void;
};

type NumberRange = { min: number; max?: number; step: number };

type SliderRange = { min: number; max: number; step: number };

const NUMBER_WITH_UNIT = /^(?<amount>-?\d*\.?\d+)(?<unit>px|rem|em|ms)?$/;
const FONT_WEIGHT_PREFIX = '--font-weight-';
const CSS_VALUE_ERROR = 'Use a CSS value such as 2rem or #4f46e5';
const NUMBER_ERROR = 'Enter a number';

const COMPONENT_TOKEN_SOURCES: { keyword: string; group: TokenGroup }[] = [
  { keyword: 'radius', group: 'shape' },
  { keyword: 'padding', group: 'spacing' },
  { keyword: 'shadow', group: 'elevation' },
];

const SHAPE_SLIDERS: Record<string, SliderRange> = {
  rem: { min: 0, max: 3, step: 0.05 },
  px: { min: 0, max: 48, step: 1 },
};

function numberRange(token: Token, unit: string): NumberRange {
  if (unit === 'rem' || unit === 'em') {
    return { min: 0, step: 0.05 };
  } else if (unit === 'px') {
    return { min: 0, step: 1 };
  } else if (unit === 'ms') {
    return { min: 0, step: 10 };
  } else if (token.name.startsWith(FONT_WEIGHT_PREFIX)) {
    return { min: 100, max: 900, step: 100 };
  } else {
    return { min: 0, step: 0.05 };
  }
}

function numberError(text: string): string | null {
  if (text.trim() !== '' && Number.isFinite(Number(text))) return null;
  return NUMBER_ERROR;
}

function cssValueError(text: string): string | null {
  return isSafeCssValue(text) ? null : CSS_VALUE_ERROR;
}

export function componentTokenOptions(token: Token, tokens: Record<string, Token>): Token[] {
  const source = COMPONENT_TOKEN_SOURCES.find(({ keyword }) => token.name.includes(keyword));
  const options: Token[] = [];
  if (source === undefined) return options;
  for (const candidate of Object.values(tokens)) {
    if (candidate.group === source.group) options.push(candidate);
  }
  return options;
}

function ColorTokenControl({ token, tokens, onChange }: TokenControlProps): JSX.Element {
  const id = `ve-token-${token.name}`;
  return (
    <Field id={id} label={token.label} layout="inline" className="ve-token-row">
      <input
        type="color"
        className="ve-color-input"
        aria-label={`${token.label}: pick a color`}
        value={toPickerHex(resolveColor(token.value, tokens))}
        onChange={(event) => onChange(event.target.value, 'continuous')}
      />
      <DraftInput
        id={id}
        value={token.value}
        validate={cssValueError}
        onCommit={(text) => onChange(text, 'continuous')}
      />
    </Field>
  );
}

function NumberTokenControl({
  token,
  amount,
  unit,
  onChange,
}: {
  token: Token;
  amount: string;
  unit: string;
  onChange: TokenControlProps['onChange'];
}): JSX.Element {
  const id = `ve-token-${token.name}`;
  const range = numberRange(token, unit);
  const slider = token.group === 'shape' ? SHAPE_SLIDERS[unit] : undefined;
  const hasSlider = slider !== undefined && Number(amount) <= slider.max;

  function commit(text: string): void {
    onChange(`${Number(text)}${unit}`, 'continuous');
  }

  return (
    <Field id={id} label={token.label} layout="inline" className="ve-token-row">
      {hasSlider && (
        <input
          type="range"
          className="ve-range-input"
          aria-label={`${token.label}: slider`}
          min={slider.min}
          max={slider.max}
          step={slider.step}
          value={amount}
          onChange={(event) => commit(event.target.value)}
        />
      )}
      <DraftInput
        id={id}
        type="number"
        unit={unit === '' ? undefined : unit}
        min={range.min}
        max={range.max}
        step={range.step}
        value={amount}
        validate={numberError}
        onCommit={commit}
      />
    </Field>
  );
}

function TextTokenControl({ token, onChange }: Omit<TokenControlProps, 'tokens'>): JSX.Element {
  const id = `ve-token-${token.name}`;
  return (
    <Field id={id} label={token.label} layout="inline" className="ve-token-row">
      <DraftInput
        id={id}
        value={token.value}
        validate={cssValueError}
        onCommit={(text) => onChange(text, 'continuous')}
      />
    </Field>
  );
}

export function TokenControl({ token, tokens, onChange }: TokenControlProps): JSX.Element {
  if (token.group === 'color') {
    return <ColorTokenControl token={token} tokens={tokens} onChange={onChange} />;
  }
  if (token.group === 'component') {
    return (
      <TokenSelect
        id={`ve-token-${token.name}`}
        label={token.label}
        layout="inline"
        value={token.value}
        options={componentTokenOptions(token, tokens)}
        onChange={onChange}
      />
    );
  }
  const number = NUMBER_WITH_UNIT.exec(token.value.trim())?.groups;
  if (number?.amount !== undefined) {
    return (
      <NumberTokenControl
        token={token}
        amount={number.amount}
        unit={number.unit ?? ''}
        onChange={onChange}
      />
    );
  }
  return <TextTokenControl token={token} onChange={onChange} />;
}
