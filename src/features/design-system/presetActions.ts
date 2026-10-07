import { designPreviewSet } from '../../app/editorSlice';
import { designSystemApplied } from '../../app/projectSlice';
import type { AppThunk } from '../../app/store';
import type { DesignSystem, DesignSystemPreset } from '../../app/types';
import { deleteUserPreset, listUserPresets, putUserPreset } from '../../persistence/db';
import { ProjectFormatError } from '../../persistence/validateProject';
import { applyPreset, parsePreset, PRESET_GROUPS, type PresetGroup } from '../../presets/presets';
import { ensureIconSets } from '../icons/ensureIconSets';

export function previewPreset(
  preset: DesignSystemPreset | null,
  isStillWanted: () => boolean = () => true,
): AppThunk<Promise<void>> {
  return async (dispatch, getState) => {
    if (preset === null) {
      dispatch(designPreviewSet(null));
      return;
    }
    await ensureIconSets([preset.designSystem.iconSet]);
    if (!isStillWanted()) return;
    const current = getState().project.designSystem;
    dispatch(designPreviewSet(applyPreset(current, preset, PRESET_GROUPS)));
  };
}

export function applyPresetGroups(
  preset: DesignSystemPreset,
  groups: readonly PresetGroup[],
): AppThunk<Promise<void>> {
  return async (dispatch, getState) => {
    if (groups.includes('icons')) await ensureIconSets([preset.designSystem.iconSet]);
    const current = getState().project.designSystem;
    dispatch(designSystemApplied(applyPreset(current, preset, groups)));
    dispatch(designPreviewSet(null));
  };
}

export async function loadUserPresets(): Promise<DesignSystemPreset[]> {
  const presets: DesignSystemPreset[] = [];
  for (const stored of await listUserPresets()) {
    try {
      presets.push(parsePreset(stored, 'user'));
    } catch (error) {
      console.warn('Skipped a saved preset that could not be read', error);
    }
  }
  presets.sort((left, right) => left.name.localeCompare(right.name));
  return presets;
}

function withoutPresetId(designSystem: DesignSystem): DesignSystem {
  const copy = structuredClone(designSystem);
  delete copy.presetId;
  return copy;
}

export async function saveUserPreset(
  name: string,
  designSystem: DesignSystem,
): Promise<DesignSystemPreset> {
  const preset: DesignSystemPreset = {
    id: crypto.randomUUID(),
    name: name.trim(),
    description: '',
    tags: [],
    source: 'user',
    designSystem: withoutPresetId(designSystem),
  };
  await putUserPreset(preset);
  return preset;
}

export async function removeUserPreset(presetId: string): Promise<void> {
  await deleteUserPreset(presetId);
}

export function presetFileText(preset: DesignSystemPreset): string {
  const { id, name, description, tags, designSystem } = preset;
  return `${JSON.stringify({ id, name, description, tags, designSystem }, null, 2)}\n`;
}

export async function importPresetText(text: string): Promise<DesignSystemPreset> {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch (error) {
    throw new ProjectFormatError('This file is not a preset file', { cause: error });
  }
  const preset = { ...parsePreset(data, 'user'), id: crypto.randomUUID() };
  await putUserPreset(preset);
  return preset;
}
