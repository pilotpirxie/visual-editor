import type { JSX } from 'react';
import {
  blockOverrideRemoved,
  blockOverrideSet,
  blockSectionThemeSet,
  type EditKind,
} from '../../app/projectSlice';
import { activeSectionTheme, SECTION_THEMES, supportsSectionThemes } from '../../app/sectionThemes';
import { dispatch, useStore } from '../../app/store';
import type { ComponentBlock, Token } from '../../app/types';
import type { ComponentDefinition, Field } from '../../components/types';
import { tokenReference } from '../../render/css';
import { FieldControl } from './FieldControl';
import { TokenSelect } from './TokenSelect';
import { IconButton, Section, SegmentedControl } from '../../../packages/ui/src';
import { useSection } from '../editor/useSection';

type OverrideRowProps = {
  block: ComponentBlock;
  name: string;
  tokens: Record<string, Token>;
};

const DESIGN_VALUE_LABEL = 'Design value';

function tokenOptions(token: Token | undefined, tokens: Record<string, Token>): Token[] {
  const options: Token[] = [];
  if (token === undefined) return options;
  options.push({ ...token, label: DESIGN_VALUE_LABEL });
  for (const candidate of Object.values(tokens)) {
    if (candidate.group === token.group && candidate.name !== token.name) options.push(candidate);
  }
  return options;
}

function OverrideControl({
  block,
  name,
  token,
  tokens,
}: {
  block: ComponentBlock;
  name: string;
  token: Token | undefined;
  tokens: Record<string, Token>;
}): JSX.Element {
  const label = token?.label ?? name;
  const value = block.overrides[name] ?? tokenReference(name);

  function change(next: unknown, kind: EditKind): void {
    if (typeof next !== 'string') return;
    dispatch(blockOverrideSet(block.id, name, next, kind));
  }

  if (token?.group === 'color') {
    const field: Field = { name, label, type: 'color', default: tokenReference(name) };
    return <FieldControl field={field} value={value} path={`style.${name}`} onChange={change} />;
  }
  return (
    <TokenSelect
      id={`ve-style-${name}`}
      label={label}
      value={value}
      options={tokenOptions(token, tokens)}
      onChange={change}
    />
  );
}

function OverrideRow({ block, name, tokens }: OverrideRowProps): JSX.Element {
  const token = tokens[name];
  const label = token?.label ?? name;
  const isOverridden = block.overrides[name] !== undefined;

  return (
    <div className="ve-override" data-token={name}>
      <OverrideControl block={block} name={name} token={token} tokens={tokens} />
      {isOverridden && (
        <IconButton
          className="ve-override-reset"
          label={`Reset ${label} to the design value`}
          icon="rotate-ccw"
          onClick={() => dispatch(blockOverrideRemoved({ blockId: block.id, token: name }))}
        />
      )}
    </div>
  );
}

const THEME_OPTIONS = SECTION_THEMES.map(({ id, label }) => ({ value: id, label }));

function SectionThemePicker({ block }: { block: ComponentBlock }): JSX.Element {
  const section = useSection('style:theme');
  return (
    <Section title="Section theme" isOpen={section.isOpen} onToggle={section.onToggle}>
      <SegmentedControl
        legend="Section theme"
        isLegendHidden
        name={`ve-section-theme-${block.id}`}
        options={THEME_OPTIONS}
        value={activeSectionTheme(block.overrides) ?? ''}
        onChange={(themeId) => dispatch(blockSectionThemeSet({ blockId: block.id, themeId }))}
      />
    </Section>
  );
}

export function StyleTab({
  block,
  definition,
}: {
  block: ComponentBlock;
  definition: ComponentDefinition;
}): JSX.Element {
  const tokens = useStore((state) => state.project.designSystem.tokens);
  const section = useSection('style:overrides');

  if (definition.styleOverrides.length === 0) {
    return <p className="ui-muted ve-properties-empty">This block has no style options.</p>;
  }

  return (
    <>
      {supportsSectionThemes(definition) && <SectionThemePicker block={block} />}
      <Section title="Overrides" isOpen={section.isOpen} onToggle={section.onToggle}>
        {definition.styleOverrides.map((name) => (
          <OverrideRow key={name} block={block} name={name} tokens={tokens} />
        ))}
      </Section>
    </>
  );
}
