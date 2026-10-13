import { describe, expect, it, vi } from 'vitest';
import { changeValue, click, getButton, queryButton, render } from '../../../src/test/dom';
import { SearchInput } from './SearchInput';

describe('SearchInput', () => {
  it('is a search field named by its label, which is also the placeholder', () => {
    const { container } = render(<SearchInput label="Search blocks" value="" onQuery={vi.fn()} />);
    const input = container.querySelector('input');
    expect(input?.type).toBe('search');
    expect(input?.getAttribute('aria-label')).toBe('Search blocks');
    expect(input?.placeholder).toBe('Search blocks');
  });

  it('keeps a placeholder of its own', () => {
    const { container } = render(
      <SearchInput label="Search fonts" placeholder="Inter, Lora…" value="" onQuery={vi.fn()} />,
    );
    expect(container.querySelector('input')?.placeholder).toBe('Inter, Lora…');
  });

  it('reports what is typed', () => {
    const onQuery = vi.fn();
    const { container } = render(<SearchInput label="Search blocks" value="" onQuery={onQuery} />);
    changeValue(container.querySelector('input'), 'hero');
    expect(onQuery).toHaveBeenCalledWith('hero');
  });

  it('offers no clear button while the field is empty', () => {
    const { container } = render(<SearchInput label="Search blocks" value="" onQuery={vi.fn()} />);
    expect(queryButton(container, 'Clear search')).toBeNull();
  });

  it('clears the text with a pointer-only button and keeps the cursor in the field', () => {
    const onQuery = vi.fn();
    const { container } = render(
      <SearchInput label="Search blocks" value="hero" onQuery={onQuery} />,
    );
    const clear = getButton(container, 'Clear search');
    expect(clear.tabIndex).toBe(-1);
    click(clear);
    expect(onQuery).toHaveBeenCalledWith('');
    expect(document.activeElement).toBe(container.querySelector('input'));
  });
});
