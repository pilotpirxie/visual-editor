import { describe, expect, it, vi } from 'vitest';
import { changeValue, render } from '../../../src/test/dom';
import { NumberInput } from './NumberInput';
import { Select } from './Select';
import { TextArea } from './TextArea';
import { TextInput } from './TextInput';

describe('TextInput', () => {
  it('is a text input that marks itself invalid only when asked', () => {
    const { container, rerender } = render(<TextInput aria-label="Title" />);
    const input = container.querySelector('input');
    expect(input?.type).toBe('text');
    expect(input?.hasAttribute('aria-invalid')).toBe(false);
    rerender(<TextInput aria-label="Title" isInvalid />);
    expect(container.querySelector('input')?.getAttribute('aria-invalid')).toBe('true');
  });

  it('reports typed text', () => {
    const onChange = vi.fn();
    const { container } = render(<TextInput aria-label="Title" value="" onChange={onChange} />);
    changeValue(container.querySelector('input'), 'Fieldnote');
    expect(onChange).toHaveBeenCalledTimes(1);
  });
});

describe('NumberInput', () => {
  it('shows its unit next to the number without reading it out twice', () => {
    const { container } = render(
      <NumberInput aria-label="Base size" unit="px" value={16} readOnly />,
    );
    expect(container.querySelector('input')?.type).toBe('number');
    const unit = container.querySelector('.ui-unit');
    expect(unit?.textContent).toBe('px');
    expect(unit?.getAttribute('aria-hidden')).toBe('true');
  });

  it('renders just the input when it has no unit', () => {
    const { container } = render(<NumberInput aria-label="Count" value={3} readOnly />);
    expect(container.firstElementChild?.tagName.toLowerCase()).toBe('input');
  });
});

describe('TextArea', () => {
  it('is a resizable text area', () => {
    const { container } = render(<TextArea aria-label="Description" />);
    expect(container.querySelector('textarea')?.className).toBe('ui-input ui-textarea');
  });
});

describe('Select', () => {
  it('lists its options and reports the chosen one', () => {
    const onChange = vi.fn();
    const { container } = render(
      <Select
        aria-label="Device"
        value="desktop"
        options={[
          { value: 'desktop', label: 'Desktop' },
          { value: 'phone', label: 'Phone' },
          { value: 'watch', label: 'Watch', isDisabled: true },
        ]}
        onChange={(event) => onChange(event.target.value)}
      />,
    );
    const select = container.querySelector('select');
    expect(select?.options).toHaveLength(3);
    expect(select?.options[2]?.disabled).toBe(true);
    changeValue(select, 'phone');
    expect(onChange).toHaveBeenCalledWith('phone');
  });
});
