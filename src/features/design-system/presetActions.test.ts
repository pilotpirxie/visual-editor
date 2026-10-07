import { describe, expect, it, vi } from 'vitest';
import { undo } from '../../app/history';
import { BUILTIN_PRESETS } from '../../presets/presets';
import { createTestStore } from '../../test/fixtures';
import { ensureIconSets } from '../icons/ensureIconSets';
import { applyPresetGroups } from './presetActions';

vi.mock('../icons/ensureIconSets', () => ({ ensureIconSets: vi.fn(async () => {}) }));

const midnight = BUILTIN_PRESETS[1];

describe('applyPresetGroups', () => {
  it('applies the chosen groups in one undo step', async () => {
    const store = createTestStore();
    const before = store.getState().project.designSystem;
    await store.dispatch(applyPresetGroups(midnight, ['colors', 'icons']));
    const after = store.getState().project.designSystem;
    expect(after.tokens['--color-background']?.value).toBe('#0b0f1a');
    expect(after.iconSet).toBe('phosphor');
    expect(after.fonts).toEqual(before.fonts);
    store.dispatch(undo());
    expect(store.getState().project.designSystem).toEqual(before);
  });

  it('loads the preset icon set before taking it', async () => {
    const store = createTestStore();
    await store.dispatch(applyPresetGroups(midnight, ['icons']));
    expect(ensureIconSets).toHaveBeenCalledWith(['phosphor']);
  });

  it('does not load icons when the icon group is left out', async () => {
    vi.mocked(ensureIconSets).mockClear();
    const store = createTestStore();
    await store.dispatch(applyPresetGroups(midnight, ['colors']));
    expect(ensureIconSets).not.toHaveBeenCalled();
  });

  it('changes nothing when icons fail to load', async () => {
    vi.mocked(ensureIconSets).mockRejectedValueOnce(new Error('Offline'));
    const store = createTestStore();
    const before = store.getState().project;
    await expect(store.dispatch(applyPresetGroups(midnight, ['icons']))).rejects.toThrow('Offline');
    expect(store.getState().project).toBe(before);
  });
});
