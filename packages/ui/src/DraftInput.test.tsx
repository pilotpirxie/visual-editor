import { describe, expect, it, vi } from 'vitest';
import { blur, changeValue, render } from '../../../src/test/dom';
import { DraftInput } from './DraftInput';

function validateSlug(text: string): string | null {
  return /^[a-z0-9-]+$/.test(text) ? null : 'Use lowercase letters, digits and hyphens';
}

describe('DraftInput', () => {
  it('commits valid text right away', () => {
    const onCommit = vi.fn();
    const { container } = render(
      <DraftInput id="slug" value="about" validate={validateSlug} onCommit={onCommit} />,
    );
    changeValue(container.querySelector('input'), 'about-us');
    expect(onCommit).toHaveBeenCalledWith('about-us');
    expect(container.querySelector('[role="alert"]')).toBeNull();
  });

  it('keeps invalid text as a draft and explains it once the field is left', () => {
    const onCommit = vi.fn();
    const { container } = render(
      <DraftInput id="slug" value="about" validate={validateSlug} onCommit={onCommit} />,
    );
    const input = container.querySelector('input');
    changeValue(input, 'About Us');
    expect(onCommit).not.toHaveBeenCalled();
    expect(input?.value).toBe('About Us');
    expect(input?.hasAttribute('aria-invalid')).toBe(false);
    expect(container.querySelector('[role="alert"]')).toBeNull();
    blur(input);
    expect(input?.getAttribute('aria-invalid')).toBe('true');
    expect(input?.getAttribute('aria-describedby')).toBe('slug-error');
    expect(container.querySelector('#slug-error')?.textContent).toBe(
      'Use lowercase letters, digits and hyphens',
    );
  });

  it('keeps the shown error up to date and hides it once the text is valid', () => {
    const onCommit = vi.fn();
    const { container } = render(
      <DraftInput id="slug" value="about" validate={validateSlug} onCommit={onCommit} />,
    );
    const input = container.querySelector('input');
    changeValue(input, 'About Us');
    blur(input);
    changeValue(input, 'About');
    expect(container.querySelector('#slug-error')?.textContent).toBe(
      'Use lowercase letters, digits and hyphens',
    );
    changeValue(input, 'about');
    expect(onCommit).toHaveBeenCalledWith('about');
    expect(container.querySelector('[role="alert"]')).toBeNull();
  });

  it('drops the draft when the stored value changes elsewhere', () => {
    const { container, rerender } = render(
      <DraftInput id="slug" value="about" validate={validateSlug} onCommit={() => {}} />,
    );
    changeValue(container.querySelector('input'), 'About Us');
    rerender(<DraftInput id="slug" value="team" validate={validateSlug} onCommit={() => {}} />);
    expect(container.querySelector('input')?.value).toBe('team');
    expect(container.querySelector('[role="alert"]')).toBeNull();
  });

  it('shows a number input with its unit for numbers', () => {
    const { container } = render(
      <DraftInput
        id="width"
        label="Container width"
        type="number"
        unit="rem"
        value="72"
        validate={() => null}
        onCommit={() => {}}
      />,
    );
    const input = container.querySelector('input');
    expect(input?.type).toBe('number');
    expect(input?.getAttribute('aria-label')).toBe('Container width');
    expect(container.querySelector('.ui-unit')?.textContent).toBe('rem');
  });
});
