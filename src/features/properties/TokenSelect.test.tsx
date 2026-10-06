import { describe, expect, it, vi } from 'vitest';
import type { Token } from '../../app/types';
import { changeValue, render } from '../../test/dom';
import { TokenSelect } from './TokenSelect';

const OPTIONS: Token[] = [
  { name: '--radius-sm', label: 'Small radius', group: 'shape', value: '0.25rem' },
  { name: '--radius-md', label: 'Medium radius', group: 'shape', value: '0.5rem' },
];

function renderSelect(value: string) {
  const onChange = vi.fn();
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
    expect(onChange).not.toHaveBeenCalled();
    expect(container.querySelector('[role="alert"]')).not.toBeNull();
    rerender(
      <TokenSelect id="radius" label="Radius" value="6px" options={OPTIONS} onChange={onChange} />,
    );
    expect(container.querySelector('input')).toHaveProperty('value', '6px');
    expect(container.querySelector('[role="alert"]')).toBeNull();
  });
});
