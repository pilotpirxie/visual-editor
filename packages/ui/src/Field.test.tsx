import { describe, expect, it } from 'vitest';
import { render } from '../../../src/test/dom';
import { Field, FieldError, fieldErrorId } from './Field';
import { TextInput } from './TextInput';

describe('Field', () => {
  it('labels the control it wraps', () => {
    const { container } = render(
      <Field id="site-title" label="Site title">
        <TextInput id="site-title" />
      </Field>,
    );
    const label = container.querySelector('label');
    expect(label?.htmlFor).toBe('site-title');
    expect(label?.textContent).toBe('Site title');
    expect(container.querySelector('[role="alert"]')).toBeNull();
  });

  it('shows an error as an alert with an id the control can point to', () => {
    const { container } = render(
      <Field id="slug" label="Slug" error="Use letters, digits and hyphens">
        <TextInput id="slug" aria-describedby={fieldErrorId('slug')} isInvalid />
      </Field>,
    );
    const error = container.querySelector('[role="alert"]');
    expect(error?.id).toBe('slug-error');
    expect(error?.textContent).toBe('Use letters, digits and hyphens');
    expect(container.querySelector('.ui-field')?.hasAttribute('data-invalid')).toBe(true);
    expect(container.querySelector('input')?.getAttribute('aria-invalid')).toBe('true');
  });

  it('lays the label beside the control when asked', () => {
    const { container } = render(
      <Field id="radius" label="Radius" layout="inline">
        <TextInput id="radius" />
      </Field>,
    );
    expect(container.querySelector('.ui-field')?.getAttribute('data-layout')).toBe('inline');
  });
});

describe('FieldError', () => {
  it('renders nothing without an error', () => {
    const { container } = render(<FieldError id="title" error={null} />);
    expect(container.innerHTML).toBe('');
  });
});
