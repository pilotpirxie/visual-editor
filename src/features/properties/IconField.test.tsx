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

describe('IconField picker', () => {
  function summary(container: HTMLElement): string | null {
    return container.querySelector('.ve-icon-picker [aria-live="polite"]')?.textContent ?? null;
  }

  it('shows the first 96 icons of a long list and says how many there are', () => {
    const { container } = renderIconField('lucide:zap');
    click(getButton(container, 'Change'));
    expect(container.querySelectorAll('.ve-icon-option')).toHaveLength(96);
    expect(summary(container)).toMatch(/^96 of \d+ icons$/);
    changeValue(container.querySelector('input[type="search"]'), 'rocket');
    const shown = container.querySelectorAll('.ve-icon-option').length;
    expect(shown).toBeGreaterThan(0);
    expect(summary(container)).toBe(`${shown} icons`);
  });

  it('says so when no icon matches', () => {
    const { container } = renderIconField('lucide:zap');
    click(getButton(container, 'Change'));
    changeValue(container.querySelector('input[type="search"]'), 'zzzzqqqq');
    expect(container.querySelectorAll('.ve-icon-option')).toHaveLength(0);
    expect(summary(container)).toBe('0 icons');
  });

  it('marks the current icon as pressed', () => {
    const { container } = renderIconField('lucide:rocket');
    click(getButton(container, 'Change'));
    changeValue(container.querySelector('input[type="search"]'), 'rocket');
    const current = container.querySelector('button[aria-label="rocket"]');
    expect(current?.getAttribute('aria-pressed')).toBe('true');
    expect(container.querySelectorAll('.ve-icon-option[aria-pressed="true"]')).toHaveLength(1);
  });

  it('opens and closes from its button and keeps the chosen set for next time', async () => {
    await loadIconSet('remix');
    const { container, onChange } = renderIconField('lucide:zap');
    const toggle = getButton(container, 'Change');
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    click(toggle);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(toggle.textContent).toBe('Close');
    changeValue(container.querySelector('select[aria-label="Icon set"]'), 'remix');
    click(toggle);
    expect(container.querySelector('.ve-icon-picker')).toBeNull();
    click(toggle);
    const set = container.querySelector<HTMLSelectElement>('select[aria-label="Icon set"]');
    expect(set?.value).toBe('remix');
    expect(container.querySelector<HTMLInputElement>('input[type="search"]')?.value).toBe('');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('offers a style filter only for a set that has styles and resets it with the set', async () => {
    await loadIconSet('remix');
    const { container } = renderIconField('zap');
    click(getButton(container, 'Change'));
    expect(container.querySelector('select[aria-label="Icon style"]')).toBeNull();
    changeValue(container.querySelector('select[aria-label="Icon set"]'), 'remix');
    changeValue(container.querySelector('select[aria-label="Icon style"]'), 'fill');
    changeValue(container.querySelector('select[aria-label="Icon set"]'), 'lucide');
    expect(container.querySelector('select[aria-label="Icon style"]')).toBeNull();
    changeValue(container.querySelector('select[aria-label="Icon set"]'), 'remix');
    const style = container.querySelector<HTMLSelectElement>('select[aria-label="Icon style"]');
    expect(style?.value).toBe('any');
  });

  it('names the set of each icon when several sets are searched', async () => {
    await loadIconSet('remix');
    const { container, onChange } = renderIconField('zap');
    click(getButton(container, 'Change'));
    changeValue(container.querySelector('select[aria-label="Icon set"]'), 'all');
    changeValue(container.querySelector('input[type="search"]'), 'rocket');
    const fromLucide = container.querySelector('button[aria-label="rocket, Lucide"]');
    expect(fromLucide?.getAttribute('title')).toBe('rocket (Lucide)');
    click(fromLucide);
    expect(onChange).toHaveBeenCalledWith('lucide:rocket', 'discrete');
  });

  it('shows no icon and no way back for an empty value that is the default', () => {
    const { container } = renderIconField('', { ...iconField, default: '' });
    expect(container.querySelector('.ve-icon-name')?.textContent).toBe('No icon');
    expect(container.querySelector('.ve-icon-preview')?.innerHTML).toBe('');
    expect(queryButton(container, 'Use default')).toBeNull();
  });
});
