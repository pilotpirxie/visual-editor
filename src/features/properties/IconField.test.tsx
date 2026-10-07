import { beforeAll, describe, expect, it, vi } from 'vitest';
import type { Field } from '../../components/types';
import { changeValue, click, getButton, pressKey, queryButton, render } from '../../test/dom';
import { loadIconSet } from '../icons/loadIconSet';
import { IconField } from './IconField';

const iconField: Field = { name: 'icon', label: 'Icon', type: 'icon', default: 'zap' };

function renderIconField(
  value: string,
  field: Field = iconField,
): {
  container: HTMLDivElement;
  onChange: ReturnType<typeof vi.fn>;
} {
  const onChange = vi.fn();
  const { container } = render(
    <IconField
      field={field}
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
    expect(container.querySelector('.ve-icon-name')?.textContent).toBe('zap · Lucide');
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

function setOptions(container: HTMLElement): string[] {
  const select = container.querySelector('select[aria-label="Icon set"]');
  const labels: string[] = [];
  for (const option of select?.querySelectorAll('option') ?? [])
    labels.push(option.textContent ?? '');
  return labels;
}

describe('IconField sets and styles', () => {
  it('offers every icon set except brand logos, plus the default set and all sets', () => {
    const { container } = renderIconField('zap');
    click(getButton(container, 'Change'));
    const options = setOptions(container);
    expect(options[0]).toBe('Default set (Lucide)');
    expect(options).toContain('Remix Icon');
    expect(options).toContain('All sets');
    expect(options).not.toContain('Simple Icons');
  });

  it('keeps Remix Icon and Simple Icons out of logo fields and brands in brand fields', () => {
    const logo = renderIconField('lucide:zap', { ...iconField, iconPurpose: 'logo' });
    click(getButton(logo.container, 'Change'));
    expect(setOptions(logo.container)).not.toContain('Remix Icon');
    expect(setOptions(logo.container)).not.toContain('Simple Icons');
    const brand = renderIconField('lucide:zap', { ...iconField, iconPurpose: 'brand' });
    click(getButton(brand.container, 'Change'));
    expect(setOptions(brand.container)).toContain('Simple Icons');
  });

  it('says a semantic icon follows the default set and offers to return to the default', () => {
    const semantic = renderIconField('zap');
    expect(semantic.container.querySelector('.ve-icon-name')?.textContent).toBe(
      'zap · follows the default set',
    );
    expect(queryButton(semantic.container, 'Use default')).toBeNull();
    const picked = renderIconField('lucide:rocket');
    click(getButton(picked.container, 'Use default'));
    expect(picked.onChange).toHaveBeenCalledWith('zap', 'discrete');
  });

  it('filters a set with styles by style', async () => {
    await loadIconSet('remix');
    const { container } = renderIconField('zap');
    click(getButton(container, 'Change'));
    changeValue(container.querySelector('select[aria-label="Icon set"]'), 'remix');
    changeValue(container.querySelector('select[aria-label="Icon style"]'), 'fill');
    changeValue(container.querySelector('input[type="search"]'), 'rocket');
    expect(container.querySelector('button[aria-label="rocket-fill"]')).not.toBeNull();
    expect(container.querySelector('button[aria-label="rocket-line"]')).toBeNull();
  });
});
