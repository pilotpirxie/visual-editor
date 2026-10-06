import { act, useState, type JSX } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import type { Field } from '../../components/types';
import { FieldControl } from './FieldControl';

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

let root: Root | null = null;
let container: HTMLDivElement | null = null;

function Harness({
  field,
  initial,
  onChange,
}: {
  field: Field;
  initial: unknown;
  onChange(value: unknown): void;
}): JSX.Element {
  const [value, setValue] = useState(initial);
  return (
    <FieldControl
      field={field}
      value={value}
      path={field.name}
      onChange={(next) => {
        setValue(next);
        onChange(next);
      }}
    />
  );
}

function render(field: Field, initial: unknown = field.default) {
  const onChange = vi.fn();
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  act(() => root?.render(<Harness field={field} initial={initial} onChange={onChange} />));
  const element = container;
  return { onChange, element };
}

function setInputValue(input: Element | null, value: string): void {
  if (!(input instanceof HTMLInputElement || input instanceof HTMLSelectElement)) {
    throw new Error('Expected an input or select element');
  }
  const prototype = Object.getPrototypeOf(input);
  Object.getOwnPropertyDescriptor(prototype, 'value')?.set?.call(input, value);
  const eventType = input instanceof HTMLSelectElement ? 'change' : 'input';
  act(() => input.dispatchEvent(new Event(eventType, { bubbles: true })));
}

function click(element: Element | null): void {
  if (!(element instanceof HTMLElement)) throw new Error('Expected an element to click');
  act(() => element.click());
}

describe('FieldControl', () => {
  beforeAll(() => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  });

  afterEach(() => {
    act(() => root?.unmount());
    container?.remove();
    root = null;
    container = null;
  });

  it('labels its input and commits valid text', () => {
    const { element, onChange } = render(fields.title, 'Hello');
    const input = element.querySelector('input');
    expect(element.querySelector('label')?.htmlFor).toBe(input?.id);
    setInputValue(input, 'Hello there');
    expect(onChange).toHaveBeenLastCalledWith('Hello there');
  });

  it('keeps an empty required value as a draft with an inline error until focus leaves', () => {
    const { element, onChange } = render(fields.title, 'Hello');
    const input = element.querySelector('input');
    setInputValue(input, '');
    expect(onChange).not.toHaveBeenCalled();
    expect(element.querySelector('[role="alert"]')?.textContent).toBe('This field is required');
    expect(input?.getAttribute('aria-invalid')).toBe('true');
    act(() => input?.dispatchEvent(new FocusEvent('focusout', { bubbles: true })));
    expect(element.querySelector('[role="alert"]')).toBeNull();
    expect(input?.value).toBe('Hello');
  });

  it('blocks numbers outside min and max', () => {
    const { element, onChange } = render(fields.count);
    setInputValue(element.querySelector('input'), '12');
    expect(onChange).not.toHaveBeenCalled();
    expect(element.querySelector('[role="alert"]')?.textContent).toBe('Use 9 or less');
    setInputValue(element.querySelector('input'), '7');
    expect(onChange).toHaveBeenLastCalledWith(7);
  });

  it('keeps the slider and its number input in sync', () => {
    const { element, onChange } = render(fields.size);
    setInputValue(element.querySelector('input[type="range"]'), '8');
    expect(onChange).toHaveBeenLastCalledWith(8);
    expect(element.querySelector<HTMLInputElement>('input[type="number"]')?.value).toBe('8');
  });

  it('stores dates as ISO strings', () => {
    const { element, onChange } = render(fields.published);
    setInputValue(element.querySelector('input'), '2026-03-01');
    expect(onChange).toHaveBeenLastCalledWith('2026-03-01');
  });

  it('toggles a switch', () => {
    const { element, onChange } = render(fields.featured);
    const input = element.querySelector('input');
    expect(input?.getAttribute('role')).toBe('switch');
    click(input);
    expect(onChange).toHaveBeenLastCalledWith(true);
  });

  it('picks from a dropdown', () => {
    const { element, onChange } = render(fields.columns);
    setInputValue(element.querySelector('select'), '3');
    expect(onChange).toHaveBeenLastCalledWith('3');
  });

  it('shows segmented options as icon radios with hidden labels', () => {
    const { element, onChange } = render(fields.align);
    expect(element.querySelector('legend')?.textContent).toBe('Alignment');
    expect(element.querySelectorAll('svg')).toHaveLength(2);
    click(element.querySelector('input[value="center"]'));
    expect(onChange).toHaveBeenLastCalledWith('center');
  });

  it('picks a design color as a token reference and a custom color as hex', () => {
    const { element, onChange } = render(fields.accent);
    const primary = element.querySelector('label[title="Primary"] input');
    expect(primary instanceof HTMLInputElement && primary.checked).toBe(true);
    click(element.querySelector('label[title="Surface"] input'));
    expect(onChange).toHaveBeenLastCalledWith('var(--color-surface)');
    click(element.querySelector('label[title="Custom color"] input'));
    expect(onChange).toHaveBeenLastCalledWith('#f5f6fb');
    setInputValue(element.querySelector('input[type="text"]'), 'red; display: none');
    expect(element.querySelector('[role="alert"]')).not.toBeNull();
    setInputValue(element.querySelector('input[type="text"]'), '#0f766e');
    expect(onChange).toHaveBeenLastCalledWith('#0f766e');
  });
});
