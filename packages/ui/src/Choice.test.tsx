import { describe, expect, it, vi } from 'vitest';
import { click, render } from '../../../src/test/dom';
import { Checkbox } from './Checkbox';
import { SegmentedControl } from './SegmentedControl';
import { Switch } from './Switch';

describe('Checkbox', () => {
  it('is a checkbox named by its label', () => {
    const onChange = vi.fn();
    const { container } = render(<Checkbox label="Phone" checked={false} onChange={onChange} />);
    const input = container.querySelector('input');
    expect(input?.type).toBe('checkbox');
    expect(input?.closest('label')?.textContent).toBe('Phone');
    click(input);
    expect(onChange).toHaveBeenCalledTimes(1);
  });
});

describe('Switch', () => {
  it('is a switch named by its label', () => {
    const { container } = render(<Switch label="Shared on all pages" checked readOnly />);
    const input = container.querySelector('input');
    expect(input?.getAttribute('role')).toBe('switch');
    expect(input?.checked).toBe(true);
    expect(input?.closest('label')?.textContent).toBe('Shared on all pages');
  });
});

describe('SegmentedControl', () => {
  const options = [
    { value: 'left', label: 'Left', icon: 'align-left' },
    { value: 'center', label: 'Center' },
  ];

  it('groups the options under a legend with the current one checked', () => {
    const { container } = render(
      <SegmentedControl
        legend="Alignment"
        name="align"
        options={options}
        value="center"
        onChange={() => {}}
      />,
    );
    expect(container.querySelector('legend')?.textContent).toBe('Alignment');
    const radios = container.querySelectorAll<HTMLInputElement>('input[type="radio"]');
    expect(radios).toHaveLength(2);
    expect(radios[1]?.checked).toBe(true);
    expect(radios[0]?.name).toBe('align');
  });

  it('reports the option the user picks', () => {
    const onChange = vi.fn();
    const { container } = render(
      <SegmentedControl
        legend="Alignment"
        name="align"
        options={options}
        value="center"
        onChange={onChange}
      />,
    );
    click(container.querySelector('input[value="left"]'));
    expect(onChange).toHaveBeenCalledWith('left');
  });

  it('keeps the text of icon options for screen readers and can hide the legend', () => {
    const { container } = render(
      <SegmentedControl
        legend="Alignment"
        name="align"
        options={options}
        value="left"
        isLegendHidden
        onChange={() => {}}
      />,
    );
    expect(container.querySelector('legend')?.className).toBe('ve-visually-hidden');
    expect(container.querySelector('.ui-segment')?.textContent).toBe('Left');
  });
});
