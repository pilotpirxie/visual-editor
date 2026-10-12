import { describe, expect, it, vi, type Mock } from 'vitest';
import type { EditKind } from '../../app/projectSlice';
import type { Token } from '../../app/types';
import { blur, changeValue, render, type Rendered } from '../../test/dom';
import { TokenSelect } from './TokenSelect';

const OPTIONS: Token[] = [
  { name: '--radius-sm', label: 'Small radius', group: 'shape', value: '0.25rem' },
  { name: '--radius-md', label: 'Medium radius', group: 'shape', value: '0.5rem' },
];

type TokenChange = (value: string, kind: EditKind) => void;

function renderSelect(value: string): Rendered & { onChange: Mock<TokenChange> } {
  const onChange = vi.fn<TokenChange>();
  const rendered = render(
    <TokenSelect id="radius" label="Radius" value={value} options={OPTIONS} onChange={onChange} />,
  );
  return { ...rendered, onChange };
}

describe('TokenSelect', () => {
  it('selects the token a reference points to and hides the custom input', () => {
    const { container } = renderSelect('var(--radius-md)');
    expect(container.querySelector('select')).toHaveProperty('value', '--radius-md');
    expect(container.querySelector('input')).toBeNull();
  });

  it('reports a picked token as a reference', () => {
    const { container, onChange } = renderSelect('var(--radius-md)');
    changeValue(container.querySelector('select'), '--radius-sm');
    expect(onChange).toHaveBeenCalledWith('var(--radius-sm)', 'discrete');
  });

  it('starts a custom value from the picked token value', () => {
    const { container, onChange } = renderSelect('var(--radius-md)');
    changeValue(container.querySelector('select'), 'custom');
    expect(onChange).toHaveBeenCalledWith('0.5rem', 'discrete');
  });

  it('shows a custom value in a text input and reports safe edits while typing', () => {
    const { container, onChange } = renderSelect('3px');
    const input = container.querySelector('input');
    expect(input).toHaveProperty('value', '3px');
    changeValue(input, '4px');
    expect(onChange).toHaveBeenCalledWith('4px', 'continuous');
  });

  it('drops an invalid draft when the value changes from outside', () => {
    const { container, onChange, rerender } = renderSelect('3px');
    changeValue(container.querySelector('input'), '3px }');
    blur(container.querySelector('input'));
    expect(onChange).not.toHaveBeenCalled();
    expect(container.querySelector('[role="alert"]')).not.toBeNull();
    rerender(
      <TokenSelect id="radius" label="Radius" value="6px" options={OPTIONS} onChange={onChange} />,
    );
    expect(container.querySelector('input')).toHaveProperty('value', '6px');
    expect(container.querySelector('[role="alert"]')).toBeNull();
  });
});
