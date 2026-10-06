import { beforeAll, describe, expect, it, vi } from 'vitest';
import type { Field } from '../../components/types';
import { changeValue, click, getButton, pressKey, render } from '../../test/dom';
import { loadIconSet } from '../icons/loadIconSet';
import { IconField } from './IconField';

const iconField: Field = { name: 'icon', label: 'Icon', type: 'icon', default: 'zap' };

function renderIconField(value: string): {
  container: HTMLDivElement;
  onChange: ReturnType<typeof vi.fn>;
} {
  const onChange = vi.fn();
  const { container } = render(
    <IconField
      field={iconField}
      value={value}
      id="ve-field-icon"
      path="icon"
      describedBy={undefined}
      isInvalid={false}
      onChange={onChange}
    />,
  );
  return { container, onChange };
}

beforeAll(async () => {
  await loadIconSet('lucide');
});

describe('IconField', () => {
  it('names its button after the field so screen readers hear "Icon Change"', () => {
    const { container } = renderIconField('lucide:zap');
    const toggle = getButton(container, 'Change');
    expect(toggle.getAttribute('aria-labelledby')).toBe('ve-field-icon-label ve-field-icon');
    expect(container.querySelector('#ve-field-icon-label')?.textContent).toBe('Icon');
  });

  it('shows the current icon name', () => {
    const { container } = renderIconField('lucide:zap');
    expect(container.querySelector('.ve-icon-name')?.textContent).toBe('zap');
  });

  it('searches icons by name', () => {
    const { container } = renderIconField('lucide:zap');
    click(getButton(container, 'Change'));
    changeValue(container.querySelector('input[type="search"]'), 'rocket');
    expect(container.querySelector('button[aria-label="rocket"]')).not.toBeNull();
    expect(container.querySelector('button[aria-label="zap"]')).toBeNull();
  });

  it('stores a picked icon as a fixed set:name value and returns focus to the button', () => {
    const { container, onChange } = renderIconField('lucide:zap');
    click(getButton(container, 'Change'));
    changeValue(container.querySelector('input[type="search"]'), 'rocket');
    click(container.querySelector('button[aria-label="rocket"]'));
    expect(onChange).toHaveBeenCalledWith('lucide:rocket', 'discrete');
    expect(container.querySelector('.ve-icon-picker')).toBeNull();
    expect(document.activeElement).toBe(getButton(container, 'Change'));
  });

  it('closes the picker with Escape without changing the icon', () => {
    const { container, onChange } = renderIconField('lucide:zap');
    click(getButton(container, 'Change'));
    pressKey(container.querySelector('input[type="search"]') ?? document.body, 'Escape');
    expect(container.querySelector('.ve-icon-picker')).toBeNull();
    expect(onChange).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(getButton(container, 'Change'));
  });
});
