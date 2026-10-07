import { designSystemApplied } from '../../app/projectSlice';
import type { AppThunk } from '../../app/store';
import type { DesignSystemPreset } from '../../app/types';
import { applyPreset, type PresetGroup } from '../../presets/presets';
import { ensureIconSets } from '../icons/ensureIconSets';
import { takeSnapshot } from '../snapshots/snapshots';

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
