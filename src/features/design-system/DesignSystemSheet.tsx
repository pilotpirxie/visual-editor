import type { JSX, KeyboardEvent, ReactNode } from 'react';
import { designSheetToggled } from '../../app/editorSlice';
import { tokenSet, tokensSet, type EditKind } from '../../app/projectSlice';
import { dispatch, useStore } from '../../app/store';
import type { Token, TokenGenerators, TokenGroup } from '../../app/types';
import { Icon } from '../editor/Icon';
import { DraftInput } from '../properties/DraftInput';
import { contrastWarnings, MIN_TEXT_CONTRAST } from './colors';
import {
  activeShadowPreset,
  SHADOW_PRESETS,
  spacingTokens,
  TYPE_RATIOS,
  typeScaleTokens,
} from './generators';
import { FontPicker } from './FontPicker';
import { TokenControl } from './TokenControls';
import './designSystem.css';

const FONT_FAMILY_TOKENS = ['--font-heading', '--font-body', '--font-mono'];
const TYPE_BASE_LIMITS = { min: 12, max: 24 };
const SPACE_UNIT_LIMITS = { min: 2, max: 12 };
const SIZE_TOKEN = /^--text-/;
const SPACE_STEP_TOKEN = /^--space-\d+$/;

function tokensInGroup(tokens: Record<string, Token>, group: TokenGroup): Token[] {
  const inGroup: Token[] = [];
  for (const token of Object.values(tokens)) {
    if (token.group === group) inGroup.push(token);
  }
  return inGroup;
}

function rangeError(text: string, limits: { min: number; max: number }): string | null {
  const value = Number(text);
  if (text.trim() !== '' && value >= limits.min && value <= limits.max) return null;
  return `Use ${limits.min} to ${limits.max} px`;
}

function setToken(name: string, value: string, kind: EditKind): void {
  dispatch(tokenSet({ name, value }, kind));
}

function DesignSection({ title, children }: { title: string; children: ReactNode }): JSX.Element {
  return (
    <section className="ve-design-section">
      <h3 className="ve-group-title">{title}</h3>
      {children}
    </section>
  );
}

function TokenList({
  tokens,
  shown,
}: {
  tokens: Record<string, Token>;
  shown: Token[];
}): JSX.Element {
  return (
    <>
      {shown.map((token) => (
        <TokenControl
          key={token.name}
          token={token}
          tokens={tokens}
          onChange={(value, kind) => setToken(token.name, value, kind)}
        />
      ))}
    </>
  );
}

function ContrastNotes({ tokens }: { tokens: Record<string, Token> }): JSX.Element | null {
  const warnings = contrastWarnings(tokens);
  if (warnings.length === 0) return null;
  return (
    <ul className="ve-design-warnings" aria-label="Contrast warnings">
      {warnings.map(({ foreground, background, ratio }) => (
        <li key={`${foreground.name}-${background.name}`}>
          <Icon name="triangle-alert" />
          {foreground.label} on {background.label} has a contrast of {ratio.toFixed(1)}:1. Use at
          least {MIN_TEXT_CONTRAST}:1 so text stays readable.
        </li>
      ))}
    </ul>
  );
}

function TypeScaleControls({ generators }: { generators: TokenGenerators }): JSX.Element {
  function apply(typeBasePx: number, typeRatio: number, kind: EditKind): void {
    dispatch(
      tokensSet(
        { values: typeScaleTokens(typeBasePx, typeRatio), generators: { typeBasePx, typeRatio } },
        kind,
      ),
    );
  }

  return (
    <div className="ve-design-generator">
      <div className="ve-token-row">
        <label className="ve-control-label" htmlFor="ve-type-base">
          Base text size
        </label>
        <div className="ve-token-inputs">
          <DraftInput
            id="ve-type-base"
            label="Base text size"
            type="number"
            min={TYPE_BASE_LIMITS.min}
            max={TYPE_BASE_LIMITS.max}
            step={1}
            value={String(generators.typeBasePx)}
            validate={(text) => rangeError(text, TYPE_BASE_LIMITS)}
            onCommit={(text) => apply(Number(text), generators.typeRatio, 'continuous')}
          />
          <span className="ve-token-unit">px</span>
        </div>
      </div>
      <div className="ve-token-row">
        <label className="ve-control-label" htmlFor="ve-type-ratio">
          Scale ratio
        </label>
        <select
          id="ve-type-ratio"
          className="ve-input"
          value={String(generators.typeRatio)}
          onChange={(event) => apply(generators.typeBasePx, Number(event.target.value), 'discrete')}
        >
          {TYPE_RATIOS.map(({ value, label }) => (
            <option key={value} value={String(value)}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <p className="ve-control-help">
        Generates every text size. Headings shrink on small screens.
      </p>
    </div>
  );
}

function SpacingUnitControl({
  generators,
  tokens,
}: {
  generators: TokenGenerators;
  tokens: Record<string, Token>;
}): JSX.Element {
  function apply(spaceUnitPx: number): void {
    dispatch(
      tokensSet(
        { values: spacingTokens(spaceUnitPx, tokens), generators: { spaceUnitPx } },
        'continuous',
      ),
    );
  }

  return (
    <div className="ve-design-generator">
      <div className="ve-token-row">
        <label className="ve-control-label" htmlFor="ve-space-unit">
          Base spacing unit
        </label>
        <div className="ve-token-inputs">
          <DraftInput
            id="ve-space-unit"
            label="Base spacing unit"
            type="number"
            min={SPACE_UNIT_LIMITS.min}
            max={SPACE_UNIT_LIMITS.max}
            step={1}
            value={String(generators.spaceUnitPx)}
            validate={(text) => rangeError(text, SPACE_UNIT_LIMITS)}
            onCommit={(text) => apply(Number(text))}
          />
          <span className="ve-token-unit">px</span>
        </div>
      </div>
      <p className="ve-control-help">Generates every numbered space step.</p>
    </div>
  );
}

function ShadowPresetPicker({ tokens }: { tokens: Record<string, Token> }): JSX.Element {
  const active = activeShadowPreset(tokens);
  return (
    <fieldset className="ve-segmented">
      <legend className="ve-control-label">Shadows</legend>
      <div className="ve-segmented-options">
        {SHADOW_PRESETS.map((preset) => (
          <label key={preset.id} className="ve-segment">
            <input
              type="radio"
              name="ve-shadow-preset"
              value={preset.id}
              checked={active === preset.id}
              onChange={() => dispatch(tokensSet({ values: preset.values }, 'discrete'))}
            />
            {preset.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function closeSheet(): void {
  dispatch(designSheetToggled(false));
}

function closeOnEscape(event: KeyboardEvent<HTMLElement>): void {
  if (event.key !== 'Escape') return;
  event.preventDefault();
  closeSheet();
}

export function DesignSystemSheet(): JSX.Element {
  const tokens = useStore((state) => state.project.designSystem.tokens);
  const generators = useStore((state) => state.project.designSystem.generators);
  const typography = tokensInGroup(tokens, 'typography').filter(
    (token) => !FONT_FAMILY_TOKENS.includes(token.name),
  );

  return (
    <aside className="ve-design-sheet" aria-label="Design system" onKeyDown={closeOnEscape}>
      <header className="ve-design-sheet-header">
        <div>
          <h2 className="ve-properties-title">Design system</h2>
          <p className="ve-muted">Applies to every block on every page.</p>
        </div>
        <button
          type="button"
          className="ve-icon-button"
          aria-label="Close design system"
          title="Close (Esc)"
          onClick={closeSheet}
        >
          <Icon name="x" />
        </button>
      </header>
      <div className="ve-design-sheet-body">
        <DesignSection title="Colors">
          <ContrastNotes tokens={tokens} />
          <TokenList tokens={tokens} shown={tokensInGroup(tokens, 'color')} />
        </DesignSection>
        <DesignSection title="Typography">
          <FontPicker role="heading" label="Heading font" />
          <FontPicker role="body" label="Body font" />
          <FontPicker role="mono" label="Mono font" />
          <TypeScaleControls generators={generators} />
          <TokenList
            tokens={tokens}
            shown={typography.filter((token) => !SIZE_TOKEN.test(token.name))}
          />
          <details className="ve-design-details">
            <summary>Text sizes</summary>
            <TokenList
              tokens={tokens}
              shown={typography.filter((token) => SIZE_TOKEN.test(token.name))}
            />
          </details>
        </DesignSection>
        <DesignSection title="Spacing">
          <SpacingUnitControl generators={generators} tokens={tokens} />
          <TokenList
            tokens={tokens}
            shown={tokensInGroup(tokens, 'spacing').filter(
              (token) => !SPACE_STEP_TOKEN.test(token.name),
            )}
          />
          <details className="ve-design-details">
            <summary>Space steps</summary>
            <TokenList
              tokens={tokens}
              shown={tokensInGroup(tokens, 'spacing').filter((token) =>
                SPACE_STEP_TOKEN.test(token.name),
              )}
            />
          </details>
        </DesignSection>
        <DesignSection title="Shape and elevation">
          <TokenList tokens={tokens} shown={tokensInGroup(tokens, 'shape')} />
          <ShadowPresetPicker tokens={tokens} />
        </DesignSection>
        <DesignSection title="Components">
          <TokenList tokens={tokens} shown={tokensInGroup(tokens, 'component')} />
        </DesignSection>
        <DesignSection title="Motion">
          <TokenList tokens={tokens} shown={tokensInGroup(tokens, 'motion')} />
        </DesignSection>
      </div>
    </aside>
  );
}
