import { useState, type JSX } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { EditKind } from '../../app/projectSlice';
import type { Field } from '../../components/types';
import { blur, changeValue, click, render } from '../../test/dom';
import { FieldControl, hasControl } from './FieldControl';

const fields = {
  title: { name: 'title', label: 'Title', type: 'text', default: '', required: true },
  count: { name: 'count', label: 'Count', type: 'number', default: 3, min: 1, max: 9 },
  size: { name: 'size', label: 'Size', type: 'range', default: 4, min: 0, max: 10, step: 2 },
  published: { name: 'published', label: 'Published', type: 'date', default: '' },
  featured: { name: 'featured', label: 'Featured', type: 'boolean', default: false },
  columns: {
    name: 'columns',
    label: 'Columns',
    type: 'select',
    default: '2',
    options: [
      { value: '2', label: 'Two' },
      { value: '3', label: 'Three' },
    ],
  },
  align: {
    name: 'align',
    label: 'Alignment',
    type: 'segmented',
    default: 'left',
    options: [
      { value: 'left', label: 'Left', icon: 'align-left' },
      { value: 'center', label: 'Center', icon: 'align-center' },
    ],
  },
  accent: { name: 'accent', label: 'Accent', type: 'color', default: 'var(--color-primary)' },
} satisfies Record<string, Field>;

function Harness({
  field,
  initial,
  onChange,
}: {
  field: Field;
  initial: unknown;
  onChange(value: unknown, kind: EditKind): void;
}): JSX.Element {
  const [value, setValue] = useState(initial);
  return (
    <FieldControl
      field={field}
      value={value}
      path={field.name}
      onChange={(next, kind) => {
        setValue(next);
        onChange(next, kind);
      }}
    />
  );
}

function renderField(field: Field, initial: unknown = field.default) {
  const onChange = vi.fn();
  const { container } = render(<Harness field={field} initial={initial} onChange={onChange} />);
  return { onChange, element: container };
}

describe('FieldControl', () => {
  it('labels its input and commits valid text', () => {
    const { element, onChange } = renderField(fields.title, 'Hello');
    const input = element.querySelector('input');
    expect(element.querySelector('label')?.htmlFor).toBe(input?.id);
    changeValue(input, 'Hello there');
    expect(onChange).toHaveBeenLastCalledWith('Hello there', 'continuous');
  });

  it('keeps an empty required value as a draft with an inline error until focus leaves', () => {
    const { element, onChange } = renderField(fields.title, 'Hello');
    const input = element.querySelector('input');
    changeValue(input, '');
    expect(onChange).not.toHaveBeenCalled();
    expect(element.querySelector('[role="alert"]')?.textContent).toBe('This field is required');
    expect(input?.getAttribute('aria-invalid')).toBe('true');
    blur(input);
    expect(element.querySelector('[role="alert"]')).toBeNull();
    expect(input?.value).toBe('Hello');
  });

  it('blocks numbers outside min and max', () => {
    const { element, onChange } = renderField(fields.count);
    changeValue(element.querySelector('input'), '12');
    expect(onChange).not.toHaveBeenCalled();
    expect(element.querySelector('[role="alert"]')?.textContent).toBe('Use 9 or less');
    changeValue(element.querySelector('input'), '7');
    expect(onChange).toHaveBeenLastCalledWith(7, 'continuous');
  });

  it('keeps the slider and its number input in sync', () => {
    const { element, onChange } = renderField(fields.size);
    changeValue(element.querySelector('input[type="range"]'), '8');
    expect(onChange).toHaveBeenLastCalledWith(8, 'continuous');
    expect(element.querySelector<HTMLInputElement>('input[type="number"]')?.value).toBe('8');
  });

  it('stores dates as ISO strings', () => {
    const { element, onChange } = renderField(fields.published);
    changeValue(element.querySelector('input'), '2026-03-01');
    expect(onChange).toHaveBeenLastCalledWith('2026-03-01', 'discrete');
  });

  it('toggles a switch', () => {
    const { element, onChange } = renderField(fields.featured);
    const input = element.querySelector('input');
    expect(input?.getAttribute('role')).toBe('switch');
    click(input);
    expect(onChange).toHaveBeenLastCalledWith(true, 'discrete');
  });

  it('picks from a dropdown', () => {
    const { element, onChange } = renderField(fields.columns);
    changeValue(element.querySelector('select'), '3');
    expect(onChange).toHaveBeenLastCalledWith('3', 'discrete');
  });

  it('shows segmented options as icon radios with hidden labels', () => {
    const { element, onChange } = renderField(fields.align);
    expect(element.querySelector('legend')?.textContent).toBe('Alignment');
    expect(element.querySelectorAll('svg')).toHaveLength(2);
    click(element.querySelector('input[value="center"]'));
    expect(onChange).toHaveBeenLastCalledWith('center', 'discrete');
  });

  it('picks a design color as a token reference and a custom color as hex', () => {
    const { element, onChange } = renderField(fields.accent);
    const primary = element.querySelector('label[title="Primary"] input');
    expect(primary instanceof HTMLInputElement && primary.checked).toBe(true);
    click(element.querySelector('label[title="Surface"] input'));
    expect(onChange).toHaveBeenLastCalledWith('var(--color-surface)', 'discrete');
    click(element.querySelector('label[title="Custom color"] input'));
    expect(onChange).toHaveBeenLastCalledWith('#f5f6fb', 'discrete');
    changeValue(element.querySelector('input[type="text"]'), 'red; display: none');
    expect(element.querySelector('[role="alert"]')).not.toBeNull();
    changeValue(element.querySelector('input[type="text"]'), '#0f766e');
    expect(onChange).toHaveBeenLastCalledWith('#0f766e', 'continuous');
  });

  it('forgets an invalid draft once the value changes from outside, such as undo', () => {
    const onChange = vi.fn();
    const { container, rerender } = render(
      <FieldControl field={fields.title} value="Hello" path="title" onChange={onChange} />,
    );
    changeValue(container.querySelector('input'), '');
    expect(container.querySelector('[role="alert"]')).not.toBeNull();
    rerender(<FieldControl field={fields.title} value="Undone" path="title" onChange={onChange} />);
    rerender(<FieldControl field={fields.title} value="Hello" path="title" onChange={onChange} />);
    expect(container.querySelector('[role="alert"]')).toBeNull();
    expect(container.querySelector('input')?.value).toBe('Hello');
  });

  it('renders nothing for field types without a control yet', () => {
    const link: Field = { name: 'cta', label: 'Button', type: 'button', default: null };
    const { container } = render(
      <FieldControl field={link} value={null} path="cta" onChange={vi.fn()} />,
    );
    expect(container.innerHTML).toBe('');
  });
});

describe('hasControl', () => {
  it('is true for editable types and false for types that come later', () => {
    expect(hasControl(fields.title)).toBe(true);
    expect(hasControl({ name: 'cta', label: 'Button', type: 'button', default: null })).toBe(false);
  });
});
