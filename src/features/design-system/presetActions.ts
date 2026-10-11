import { designSystemApplied } from '../../app/projectSlice';
import type { AppThunk } from '../../app/store';
import type { DesignSystem, DesignSystemPreset } from '../../app/types';
import { applyPreset, type PresetGroup } from '../../presets/presets';
import { ensureIconSets } from '../icons/ensureIconSets';
import { takeSnapshot } from '../snapshots/snapshots';
import { loadFontList } from './fontList';
import { randomDesignSystem } from './randomDesignSystem';

const randomizedSystems = new WeakSet<DesignSystem>();

export function applyPresetGroups(
  preset: DesignSystemPreset,
  groups: readonly PresetGroup[],
): AppThunk<Promise<void>> {
  return async (dispatch, getState) => {
    void dispatch(takeSnapshot(`Before applying ${preset.name}`, 'auto'));
    if (groups.includes('icons')) await ensureIconSets([preset.designSystem.iconSet]);
    const current = getState().project.designSystem;
    dispatch(designSystemApplied(applyPreset(current, preset, groups)));
  };
}

export function randomizeDesignSystem(): AppThunk<Promise<void>> {
  return async (dispatch, getState) => {
    const fontList = await loadFontList();
    const [seed] = crypto.getRandomValues(new Uint32Array(1));
    const draft = randomDesignSystem(getState().project.designSystem, fontList, seed);
    await ensureIconSets([draft.iconSet]);
    const current = getState().project.designSystem;
    if (!randomizedSystems.has(current)) {
      void dispatch(takeSnapshot('Before randomizing the design', 'auto'));
    }
    const randomized = randomDesignSystem(current, fontList, seed);
    randomizedSystems.add(randomized);
    dispatch(designSystemApplied(randomized));
  };
}
