import type { JSX, KeyboardEvent, ReactNode } from 'react';
import { designSheetToggled } from '../../app/editorSlice';
import { tokenSet, tokensSet, type EditKind } from '../../app/projectSlice';
import { isThemeToken, themeFamilyTokenNames, type ThemeFamily } from '../../app/sectionThemes';
import { dispatch, useStore } from '../../app/store';
import type { Token, TokenGenerators, TokenGroup } from '../../app/types';
import {
  DraftInput,
  Field,
  Icon,
  IconButton,
  Section,
  SegmentedControl,
  Title,
} from '../../../packages/ui/src';
import { useSection } from '../editor/useSection';
import { contrastWarnings, MIN_TEXT_CONTRAST } from './colors';
import { activeShadowPreset, SHADOW_PRESETS, spacingTokens } from './generators';
import { IconSetPicker } from './IconSetPicker';
import { PresetsSection } from './PresetList';
import { TokenControl } from './TokenControls';
import { TypographySection } from './TypographySection';
import './designSystem.css';

const SPACE_UNIT_LIMITS = { min: 2, max: 12 };
const SPACE_STEP_TOKEN = /^--space-\d+$/;
const TITLE_ID = 've-design-sheet-title';

function tokensInGroup(tokens: Record<string, Token>, group: TokenGroup): Token[] {
  const inGroup: Token[] = [];
  for (const token of Object.values(tokens)) {
    if (token.group === group) inGroup.push(token);
  }
  return inGroup;
}

function spacingSplit(tokens: Record<string, Token>): { steps: Token[]; layout: Token[] } {
  const steps: Token[] = [];
  const layout: Token[] = [];
  for (const token of tokensInGroup(tokens, 'spacing')) {
    if (SPACE_STEP_TOKEN.test(token.name)) {
      steps.push(token);
    } else {
      layout.push(token);
    }
  }
  return { steps, layout };
}

function baseColorTokens(tokens: Record<string, Token>): Token[] {
  const base: Token[] = [];
  for (const token of tokensInGroup(tokens, 'color')) {
    if (!isThemeToken(token.name)) base.push(token);
  }
  return base;
}

function themeColorTokens(tokens: Record<string, Token>, family: ThemeFamily): Token[] {
  const familyTokens: Token[] = [];
  for (const name of themeFamilyTokenNames(family)) {
    const token = tokens[name];
    if (token !== undefined) familyTokens.push(token);
  }
  return familyTokens;
}

function setToken(name: string, value: string, kind: EditKind): void {
  dispatch(tokenSet({ name, value }, kind));
}

function DesignSection({
  id,
  title,
  defaultOpen = true,
  children,
}: {
  id: string;
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
}): JSX.Element {
  const section = useSection(`design:${id}`, defaultOpen);
  return (
    <Section title={title} isOpen={section.isOpen} onToggle={section.onToggle}>
      {children}
    </Section>
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
    <Field id="ve-space-unit" label="Base spacing unit" layout="inline">
      <DraftInput
        id="ve-space-unit"
        type="number"
        unit="px"
        min={SPACE_UNIT_LIMITS.min}
        max={SPACE_UNIT_LIMITS.max}
        step={1}
        value={String(generators.spaceUnitPx)}
        validate={(text) => {
          const value = Number(text);
          const isInRange = value >= SPACE_UNIT_LIMITS.min && value <= SPACE_UNIT_LIMITS.max;
          if (text.trim() !== '' && isInRange) return null;
          return `Use ${SPACE_UNIT_LIMITS.min} to ${SPACE_UNIT_LIMITS.max} px`;
        }}
        onCommit={(text) => apply(Number(text))}
      />
    </Field>
  );
}

function ShadowPresetPicker({ tokens }: { tokens: Record<string, Token> }): JSX.Element {
  const options = [];
  for (const preset of SHADOW_PRESETS) options.push({ value: preset.id, label: preset.label });
  return (
    <SegmentedControl
      legend="Shadows"
      name="ve-shadow-preset"
      options={options}
      value={activeShadowPreset(tokens) ?? ''}
      onChange={(id) => {
        const preset = SHADOW_PRESETS.find((item) => item.id === id);
        if (preset !== undefined) dispatch(tokensSet({ values: preset.values }, 'discrete'));
      }}
    />
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
  const spacing = spacingSplit(tokens);

  return (
    <aside className="ve-design-sheet" aria-labelledby={TITLE_ID} onKeyDown={closeOnEscape}>
      <header className="ve-design-sheet-header">
        <Title id={TITLE_ID}>Design system</Title>
        <IconButton label="Close design system" icon="x" onClick={closeSheet} />
      </header>
      <div className="ve-design-sheet-body">
        <PresetsSection />
        <DesignSection id="colors" title="Colors">
          <ContrastNotes tokens={tokens} />
          <TokenList tokens={tokens} shown={baseColorTokens(tokens)} />
        </DesignSection>
        <DesignSection id="theme-dark" title="Dark sections" defaultOpen={false}>
          <TokenList tokens={tokens} shown={themeColorTokens(tokens, 'dark')} />
        </DesignSection>
        <DesignSection id="theme-primary" title="Primary sections" defaultOpen={false}>
          <TokenList tokens={tokens} shown={themeColorTokens(tokens, 'primary')} />
        </DesignSection>
        <TypographySection />
        <DesignSection id="spacing" title="Spacing">
          <SpacingUnitControl generators={generators} tokens={tokens} />
          <TokenList tokens={tokens} shown={spacing.layout} />
        </DesignSection>
        <DesignSection id="space-steps" title="Space steps" defaultOpen={false}>
          <TokenList tokens={tokens} shown={spacing.steps} />
        </DesignSection>
        <DesignSection id="shape" title="Shape and elevation">
          <TokenList tokens={tokens} shown={tokensInGroup(tokens, 'shape')} />
          <ShadowPresetPicker tokens={tokens} />
        </DesignSection>
        <DesignSection id="components" title="Components">
          <TokenList tokens={tokens} shown={tokensInGroup(tokens, 'component')} />
        </DesignSection>
        <DesignSection id="motion" title="Motion">
          <TokenList tokens={tokens} shown={tokensInGroup(tokens, 'motion')} />
        </DesignSection>
        <DesignSection id="icons" title="Icons">
          <IconSetPicker />
        </DesignSection>
      </div>
    </aside>
  );
}
