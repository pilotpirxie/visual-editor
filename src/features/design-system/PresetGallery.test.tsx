import { beforeEach, describe, expect, it, vi } from 'vitest';
import { store } from '../../app/store';
import { click, getButton, render } from '../../test/dom';
import { loadIntoAppStore } from '../../test/fixtures';
import { PresetGallery } from './PresetGallery';

vi.mock('../../persistence/db', () => ({
  putProject: vi.fn(async () => {}),
  listUserPresets: vi.fn(async () => []),
  putUserPreset: vi.fn(async () => {}),
  deleteUserPreset: vi.fn(async () => {}),
}));

beforeEach(() => {
  loadIntoAppStore();
});

describe('PresetGallery', () => {
  it('lists the four presets and marks the one the project uses', () => {
    const { container } = render(<PresetGallery />);
    const names = [...container.querySelectorAll('.ve-preset-card strong')].map(
      (name) => name.textContent,
    );
    expect(names).toEqual(['Clean', 'Midnight', 'Playful', 'Corporate']);
    expect(container.querySelector('.ve-preset-card[data-current] strong')?.textContent).toBe(
      'Clean',
    );
  });

  it('previews a preset on the canvas and stops on a second press', async () => {
    const { container } = render(<PresetGallery />);
    click(getButton(container, 'Preview Midnight'));
    await vi.waitFor(() =>
      expect(store.getState().editor.previewDesignSystem?.presetId).toBe('midnight'),
    );
    click(getButton(container, 'Preview Midnight'));
    await vi.waitFor(() => expect(store.getState().editor.previewDesignSystem).toBeNull());
  });

  it('applies only the parts the user keeps checked', async () => {
    const { container } = render(<PresetGallery />);
    click(getButton(container, 'Apply Corporate'));
    const dialog = container.querySelector('dialog');
    if (dialog === null) throw new Error('Expected the apply dialog');
    for (const checkbox of dialog.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')) {
      if (checkbox.parentElement?.textContent !== 'Colors') click(checkbox);
    }
    click(getButton(dialog, 'Apply'));
    await vi.waitFor(() =>
      expect(store.getState().project.designSystem.tokens['--color-primary']?.value).toBe(
        '#1e3a8a',
      ),
    );
    expect(store.getState().project.designSystem.iconSet).toBe('lucide');
  });
});
