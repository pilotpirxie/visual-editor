import { describe, expect, it } from 'vitest';
import { render } from '../../../src/test/dom';
import { SearchInput } from './SearchInput';

describe('SearchInput', () => {
  it('is a search field named by its label, which is also the placeholder', () => {
    const { container } = render(<SearchInput label="Search blocks" />);
    const input = container.querySelector('input');
    expect(input?.type).toBe('search');
    expect(input?.getAttribute('aria-label')).toBe('Search blocks');
    expect(input?.placeholder).toBe('Search blocks');
  });

  it('keeps a placeholder of its own', () => {
    const { container } = render(<SearchInput label="Search fonts" placeholder="Inter, Lora…" />);
    expect(container.querySelector('input')?.placeholder).toBe('Inter, Lora…');
  });
});
