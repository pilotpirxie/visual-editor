import { useState, type JSX } from 'react';
import { blockOverrideRemoved, blockOverrideSet, type EditKind } from '../../app/projectSlice';
import { dispatch, useStore } from '../../app/store';
import type { Block, Token } from '../../app/types';
import type { ComponentDefinition, Field } from '../../components/types';
import { tokenReference } from '../../render/css';
import { resolveColor } from '../design-system/colors';
import { Icon } from '../editor/Icon';
import { FieldControl } from './FieldControl';
import { TokenSelect } from './TokenSelect';

type OverrideRowProps = {
  block: Block;
  name: string;
  tokens: Record<string, Token>;
  isOpen: boolean;
  onOpen(): void;
  onClose(): void;
};

function sameGroupTokens(token: Token | undefined, tokens: Record<string, Token>): Token[] {
  const options: Token[] = [];
  if (token === undefined) return options;
  for (const candidate of Object.values(tokens)) {
    if (candidate.group === token.group && candidate.name !== token.name) options.push(candidate);
  }
  return options;
}

function InheritedValue({
  token,
  tokens,
}: {
  token: Token | undefined;
  tokens: Record<string, Token>;
}): JSX.Element {
  if (token === undefined) return <span className="ve-override-inherited">Not set</span>;
  return (
    <span className="ve-override-inherited">
      {token.group === 'color' && (
        <span
          className="ve-swatch-color"
          style={{ background: resolveColor(token.value, tokens) }}
        />
      )}
      {token.value}
    </span>
  );
}

function OverrideControl({
  block,
  name,
  token,
  tokens,
}: {
  block: Block;
  name: string;
  token: Token | undefined;
  tokens: Record<string, Token>;
}): JSX.Element {
  const label = token?.label ?? name;
  const override = block.overrides[name];

  function change(next: unknown, kind: EditKind): void {
    if (typeof next !== 'string') return;
    dispatch(blockOverrideSet(block.id, name, next, kind));
  }

  if (token?.group === 'color') {
    const field: Field = { name, label, type: 'color', default: tokenReference(name) };
    const value = override ?? tokenReference(name);
    return <FieldControl field={field} value={value} path={`style.${name}`} onChange={change} />;
  }
  return (
    <TokenSelect
      id={`ve-style-${name}`}
      label={label}
      value={override ?? token?.value ?? ''}
      options={sameGroupTokens(token, tokens)}
      onChange={change}
    />
  );
}

function OverrideRow({
  block,
  name,
  tokens,
  isOpen,
  onOpen,
  onClose,
}: OverrideRowProps): JSX.Element {
  const token = tokens[name];
  const label = token?.label ?? name;
  const isOverridden = block.overrides[name] !== undefined;

  function reset(): void {
    dispatch(blockOverrideRemoved({ blockId: block.id, token: name }));
    onClose();
  }

  if (!isOverridden && !isOpen) {
    return (
      <div className="ve-override" data-token={name}>
        <span className="ve-control-label">{label}</span>
        <InheritedValue token={token} tokens={tokens} />
        <button type="button" className="ve-button" onClick={onOpen}>
          Override
        </button>
      </div>
    );
  }

  return (
    <div className="ve-override ve-override--open" data-token={name}>
      <OverrideControl block={block} name={name} token={token} tokens={tokens} />
      <button
        type="button"
        className="ve-icon-button ve-override-reset"
        aria-label={`Reset ${label} to the design value`}
        title="Reset to the design value"
        onClick={reset}
      >
        <Icon name="rotate-ccw" />
      </button>
    </div>
  );
}

export function StyleTab({
  block,
  definition,
}: {
  block: Block;
  definition: ComponentDefinition;
}): JSX.Element {
  const tokens = useStore((state) => state.project.designSystem.tokens);
  const [openTokens, setOpenTokens] = useState<string[]>([]);

  if (definition.styleOverrides.length === 0) {
    return (
      <section className="ve-properties-section">
        <p className="ve-muted">This block has no style options.</p>
      </section>
    );
  }

  return (
    <section className="ve-properties-section">
      <p className="ve-muted">Overrides apply to this block only.</p>
      {definition.styleOverrides.map((name) => (
        <OverrideRow
          key={name}
          block={block}
          name={name}
          tokens={tokens}
          isOpen={openTokens.includes(name)}
          onOpen={() => setOpenTokens([...openTokens, name])}
          onClose={() => setOpenTokens(openTokens.filter((open) => open !== name))}
        />
      ))}
    </section>
  );
}
