import { beforeEach, describe, expect, it, vi } from 'vitest';
import { store } from '../../app/store';
import { click, getButton, render } from '../../test/dom';
import { homePage, loadIntoAppStore } from '../../test/fixtures';
import { DeleteBlockDialog } from './DeleteBlockDialog';

function pageBlockIds(): string[] {
  return homePage(store.getState().project).blockIds;
}

beforeEach(() => {
  loadIntoAppStore();
});

describe('DeleteBlockDialog', () => {
  it('names the block and deletes it only on confirm', () => {
    const heroId = pageBlockIds()[1];
    const onClose = vi.fn<() => void>();
    const { container } = render(<DeleteBlockDialog blockId={heroId} onClose={onClose} />);
    expect(container.querySelector('h2')?.textContent).toBe('Delete “Hero, centered text”?');
    click(getButton(container, 'Cancel'));
    expect(pageBlockIds()).toContain(heroId);
    expect(onClose).toHaveBeenCalledOnce();
    click(getButton(container, 'Delete block'));
    expect(pageBlockIds()).not.toContain(heroId);
  });

  it('can be undone', () => {
    const heroId = pageBlockIds()[1];
    const { container } = render(<DeleteBlockDialog blockId={heroId} onClose={() => {}} />);
    click(getButton(container, 'Delete block'));
    expect(container.textContent).toContain('You can undo this.');
    expect(store.getState().history.past.length).toBeGreaterThan(0);
  });
});
