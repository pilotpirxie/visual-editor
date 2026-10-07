import { describe, expect, it, vi } from 'vitest';
import { undo } from '../../app/history';
import { createTestStore } from '../../test/fixtures';
import { BUILTIN_PRESETS } from '../../presets/presets';
import {
  applyPresetGroups,
  importPresetText,
  presetFileText,
  previewPreset,
} from './presetActions';

vi.mock('../../persistence/db', () => ({
  putProject: vi.fn(async () => {}),
  putUserPreset: vi.fn(async () => {}),
  listUserPresets: vi.fn(async () => []),
  deleteUserPreset: vi.fn(async () => {}),
}));

const midnight = BUILTIN_PRESETS[1];

describe('previewPreset', () => {
  it('shows a preset on the canvas without changing the project, and clears it', async () => {
    if (midnight === undefined) throw new Error('Expected Midnight');
    const store = createTestStore();
    const before = store.getState().project;
    await store.dispatch(previewPreset(midnight));
    expect(store.getState().editor.previewDesignSystem?.presetId).toBe('midnight');
    expect(store.getState().project).toBe(before);
    await store.dispatch(previewPreset(null));
    expect(store.getState().editor.previewDesignSystem).toBeNull();
  });

  it('skips a preview the user no longer wants', async () => {
    if (midnight === undefined) throw new Error('Expected Midnight');
    const store = createTestStore();
    await store.dispatch(previewPreset(midnight, () => false));
    expect(store.getState().editor.previewDesignSystem).toBeNull();
  });
});

describe('applyPresetGroups', () => {
  it('applies the chosen groups in one undo step and ends the preview', async () => {
    if (midnight === undefined) throw new Error('Expected Midnight');
    const store = createTestStore();
    const before = store.getState().project.designSystem;
    await store.dispatch(previewPreset(midnight));
    await store.dispatch(applyPresetGroups(midnight, ['colors', 'icons']));
    const after = store.getState().project.designSystem;
    expect(after.tokens['--color-background']?.value).toBe('#0b0f1a');
    expect(after.iconSet).toBe('phosphor');
    expect(after.fonts).toEqual(before.fonts);
    expect(store.getState().editor.previewDesignSystem).toBeNull();
    store.dispatch(undo());
    expect(store.getState().project.designSystem).toEqual(before);
  });
});

describe('preset files', () => {
  it('imports an exported preset under a new id', async () => {
    if (midnight === undefined) throw new Error('Expected Midnight');
    const imported = await importPresetText(presetFileText({ ...midnight, source: 'user' }));
    expect(imported.name).toBe('Midnight');
    expect(imported.id).not.toBe('midnight');
    expect(imported.source).toBe('user');
    await expect(importPresetText('not json')).rejects.toThrow('not a preset file');
  });
});
