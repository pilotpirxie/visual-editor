import { useEffect, useRef, useState, type JSX } from 'react';
import { tokenSet, tokensSet, type EditKind } from '../../app/projectSlice';
import { dispatch, useStore } from '../../app/store';
import type { FontRole, TokenGenerators } from '../../app/types';
import { SYSTEM_FONT_WEIGHTS, WEIGHT_TOKENS } from '../../app/typography';
import { fontStack } from '../../render/fonts';
import { Button, DraftInput, Field, Section, Select } from '../../../packages/ui/src';
import { useSection } from '../editor/useSection';
import { FontBrowser, loadPreviewFont, previewWeight, useFontList } from './FontBrowser';
import { TYPE_RATIOS, typeScaleTokens } from './generators';
import type { FontFamily } from './fontList';

const WEIGHT_NAMES: Record<number, string> = {
  100: 'Thin',
  200: 'Extra light',
  300: 'Light',
  400: 'Regular',
  500: 'Medium',
  600: 'Semibold',
  700: 'Bold',
  800: 'Extra bold',
  900: 'Black',
  1000: 'Extra black',
};

const LINE_HEIGHT_TOKENS: Record<FontRole, string> = {
  heading: '--line-height-tight',
  body: '--line-height-normal',
};

const ROLE_TITLES: Record<FontRole, string> = { heading: 'Headings', body: 'Body text' };

const LINE_HEIGHT_LIMITS = { min: 0.8, max: 3 };
const TYPE_BASE_LIMITS = { min: 12, max: 24 };

function weightOptions(weights: readonly number[]): { value: string; label: string }[] {
  const options: { value: string; label: string }[] = [];
  for (const weight of weights) {
    const name = WEIGHT_NAMES[weight];
    options.push({
      value: String(weight),
      label: name === undefined ? String(weight) : `${weight} ${name}`,
    });
  }
  return options;
}

function rangeError(
  text: string,
  limits: { min: number; max: number },
  unit: string,
): string | null {
  const value = Number(text);
  if (text.trim() !== '' && value >= limits.min && value <= limits.max) return null;
  return `Use ${limits.min} to ${limits.max}${unit}`;
}

function setToken(name: string, value: string, kind: EditKind): void {
  dispatch(tokenSet({ name, value }, kind));
}

function offeredWeights(
  family: FontFamily | undefined,
  selectedFamily: string | undefined,
  current: readonly number[],
): readonly number[] {
  if (family !== undefined) return family.weights;
  if (selectedFamily === undefined) return SYSTEM_FONT_WEIGHTS;
  return current;
}

function FontRoleControls({
  role,
  families,
  isListReady,
}: {
  role: FontRole;
  families: FontFamily[];
  isListReady: boolean;
}): JSX.Element {
  const tokens = useStore((state) => state.project.designSystem.tokens);
  const selection = useStore((state) =>
    state.project.designSystem.fonts.find((font) => font.role === role),
  );
  const [isBrowsing, setIsBrowsing] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const family = families.find((item) => item.family === selection?.family);
  const title = ROLE_TITLES[role];
  const fontId = `ve-font-${role}`;
  const lineHeightToken = tokens[LINE_HEIGHT_TOKENS[role]];
  const currentWeights: number[] = [];
  for (const name of WEIGHT_TOKENS[role]) currentWeights.push(Number(tokens[name]?.value));
  const weights = offeredWeights(family, selection?.family, currentWeights);

  useEffect(() => {
    if (family === undefined) return;
    loadPreviewFont(document, family.family, previewWeight(family));
  }, [family]);

  function closeBrowser(): void {
    setIsBrowsing(false);
    toggleRef.current?.focus();
  }

  return (
    <fieldset className="ve-type-role">
      <legend className="ui-legend">{title}</legend>
      <Field id={fontId} label="Font" layout="inline">
        <Button
          ref={toggleRef}
          id={fontId}
          className="ve-font-current"
          aria-expanded={isBrowsing}
          disabled={!isListReady}
          style={
            family === undefined
              ? undefined
              : { fontFamily: fontStack(family.family, family.category) }
          }
          onClick={() => setIsBrowsing(!isBrowsing)}
        >
          {selection?.family ?? 'System font'}
        </Button>
      </Field>
      {isBrowsing && (
        <FontBrowser
          role={role}
          label={`${title} font`}
          families={families}
          current={selection?.family ?? null}
          onDone={closeBrowser}
        />
      )}
      {WEIGHT_TOKENS[role].map((name) => {
        const token = tokens[name];
        if (token === undefined) return null;
        const id = `ve-token-${name}`;
        return (
          <Field key={name} id={id} label={token.label} layout="inline">
            <Select
              id={id}
              value={token.value}
              options={weightOptions(weights)}
              onChange={(event) => setToken(name, event.target.value, 'discrete')}
            />
          </Field>
        );
      })}
      {lineHeightToken !== undefined && (
        <Field id={`ve-token-${lineHeightToken.name}`} label="Line height" layout="inline">
          <DraftInput
            id={`ve-token-${lineHeightToken.name}`}
            type="number"
            min={LINE_HEIGHT_LIMITS.min}
            max={LINE_HEIGHT_LIMITS.max}
            step={0.05}
            value={lineHeightToken.value}
            validate={(text) => rangeError(text, LINE_HEIGHT_LIMITS, '')}
            onCommit={(text) => setToken(lineHeightToken.name, text, 'continuous')}
          />
        </Field>
      )}
    </fieldset>
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

  const ratioOptions = [];
  for (const { value, label } of TYPE_RATIOS) ratioOptions.push({ value: String(value), label });

  return (
    <fieldset className="ve-type-role">
      <legend className="ui-legend">Sizes</legend>
      <Field id="ve-type-base" label="Base size" layout="inline">
        <DraftInput
          id="ve-type-base"
          type="number"
          unit="px"
          min={TYPE_BASE_LIMITS.min}
          max={TYPE_BASE_LIMITS.max}
          step={1}
          value={String(generators.typeBasePx)}
          validate={(text) => rangeError(text, TYPE_BASE_LIMITS, ' px')}
          onCommit={(text) => apply(Number(text), generators.typeRatio, 'continuous')}
        />
      </Field>
      <Field id="ve-type-ratio" label="Scale" layout="inline">
        <Select
          id="ve-type-ratio"
          value={String(generators.typeRatio)}
          options={ratioOptions}
          onChange={(event) => apply(generators.typeBasePx, Number(event.target.value), 'discrete')}
        />
      </Field>
    </fieldset>
  );
}

export function TypographySection(): JSX.Element {
  const section = useSection('design:typography');
  const generators = useStore((state) => state.project.designSystem.generators);
  const fontList = useFontList();
  const families = fontList.status === 'ready' ? fontList.families : [];

  return (
    <Section title="Typography" isOpen={section.isOpen} onToggle={section.onToggle}>
      {fontList.status === 'failed' && (
        <p className="ui-field-error" role="alert">
          The font list could not be loaded: {fontList.message}
        </p>
      )}
      <FontRoleControls
        role="heading"
        families={families}
        isListReady={fontList.status === 'ready'}
      />
      <FontRoleControls role="body" families={families} isListReady={fontList.status === 'ready'} />
      <TypeScaleControls generators={generators} />
    </Section>
  );
}
