import { useState, type JSX, type ReactNode } from 'react';
import { noticeShown } from '../../app/editorSlice';
import { describeError } from '../../app/errors';
import { dispatch, useStore } from '../../app/store';
import type { DesignSystemPreset } from '../../app/types';
import { iconSetInfo } from '../../../packages/icon-data/src/sets';
import {
  BUILTIN_PRESETS,
  PRESET_GROUP_LABELS,
  PRESET_GROUPS,
  type PresetGroup,
} from '../../presets/presets';
import {
  Button,
  Checkbox,
  closeDialogOf,
  Dialog,
  DialogActions,
  DialogBody,
  Section,
} from '../../../packages/ui/src';
import { useSection } from '../editor/useSection';
import { applyPresetGroups } from './presetActions';

const SWATCH_TOKENS = [
  '--color-primary',
  '--color-background',
  '--color-surface',
  '--color-text',
  '--color-border',
];

const APPLY_TITLE_ID = 've-apply-preset-title';

function fontSummary(preset: DesignSystemPreset): string {
  const families: string[] = [];
  for (const font of preset.designSystem.fonts) {
    if (!families.includes(font.family)) families.push(font.family);
  }
  if (families.length === 0) return 'System fonts';
  return families.join(' / ');
}

function presetSummary(preset: DesignSystemPreset): string {
  const { iconSet } = preset.designSystem;
  return `${fontSummary(preset)} · ${iconSetInfo(iconSet)?.label ?? iconSet}`;
}

function PresetSummary({ preset }: { preset: DesignSystemPreset }): JSX.Element {
  const { tokens } = preset.designSystem;
  return (
    <>
      <span className="ve-preset-swatches" aria-hidden="true">
        {SWATCH_TOKENS.map((name) => (
          <span key={name} style={{ background: tokens[name]?.value }} />
        ))}
      </span>
      <span className="ve-preset-text">
        <strong className="ve-preset-name">{preset.name}</strong>
        <span className="ui-muted">{presetSummary(preset)}</span>
      </span>
    </>
  );
}

type PresetListProps = {
  label: string;
  presets: readonly DesignSystemPreset[];
  currentPresetId?: string;
  renderAction(preset: DesignSystemPreset): ReactNode;
};

export function PresetList({
  label,
  presets,
  currentPresetId,
  renderAction,
}: PresetListProps): JSX.Element {
  return (
    <ul className="ve-preset-list" aria-label={label}>
      {presets.map((preset) => {
        const isCurrent = preset.id === currentPresetId;
        return (
          <li key={preset.id} className="ve-preset-row" data-current={isCurrent || undefined}>
            <PresetSummary preset={preset} />
            {isCurrent && <span className="ve-preset-current">Current</span>}
            {renderAction(preset)}
          </li>
        );
      })}
    </ul>
  );
}

type PresetPickerProps = {
  label: string;
  presets: readonly DesignSystemPreset[];
  isDisabled: boolean;
  onPick(preset: DesignSystemPreset): void;
};

export function PresetPicker({
  label,
  presets,
  isDisabled,
  onPick,
}: PresetPickerProps): JSX.Element {
  return (
    <ul className="ve-preset-picker" aria-label={label}>
      {presets.map((preset) => (
        <li key={preset.id}>
          <button
            type="button"
            className="ve-preset-row ve-preset-pick"
            aria-label={`Start with ${preset.name}`}
            disabled={isDisabled}
            onClick={() => onPick(preset)}
          >
            <PresetSummary preset={preset} />
          </button>
        </li>
      ))}
    </ul>
  );
}

function ApplyPresetDialog({
  preset,
  onClose,
}: {
  preset: DesignSystemPreset;
  onClose(): void;
}): JSX.Element {
  const [groups, setGroups] = useState<PresetGroup[]>([...PRESET_GROUPS]);

  function toggle(group: PresetGroup, isChecked: boolean): void {
    if (isChecked) {
      setGroups((current) => [...current, group]);
      return;
    }
    setGroups((current) => current.filter((item) => item !== group));
  }

  async function apply(element: Element): Promise<void> {
    try {
      await dispatch(applyPresetGroups(preset, groups));
    } catch (error) {
      console.error(`Applying the ${preset.name} preset failed`, error);
      dispatch(noticeShown('error', `Applying the preset failed: ${describeError(error)}`));
      return;
    }
    closeDialogOf(element);
  }

  return (
    <Dialog labelId={APPLY_TITLE_ID} onClose={onClose}>
      <DialogBody titleId={APPLY_TITLE_ID} title={`Apply ${preset.name}`}>
        <fieldset className="ve-preset-groups">
          <legend className="ui-legend">Parts to take</legend>
          {PRESET_GROUPS.map((group) => (
            <Checkbox
              key={group}
              label={PRESET_GROUP_LABELS[group]}
              checked={groups.includes(group)}
              onChange={(event) => toggle(group, event.target.checked)}
            />
          ))}
        </fieldset>
        <DialogActions>
          <Button onClick={(event) => closeDialogOf(event.currentTarget)}>Cancel</Button>
          <Button
            variant="primary"
            disabled={groups.length === 0}
            onClick={(event) => void apply(event.currentTarget)}
          >
            Apply
          </Button>
        </DialogActions>
      </DialogBody>
    </Dialog>
  );
}

export function PresetsSection(): JSX.Element {
  const section = useSection('design:presets', true);
  const currentPresetId = useStore((state) => state.project.designSystem.presetId);
  const [applying, setApplying] = useState<DesignSystemPreset | null>(null);

  return (
    <Section title="Presets" isOpen={section.isOpen} onToggle={section.onToggle}>
      <PresetList
        label="Presets"
        presets={BUILTIN_PRESETS}
        currentPresetId={currentPresetId}
        renderAction={(preset) => (
          <Button aria-label={`Apply ${preset.name}`} onClick={() => setApplying(preset)}>
            Apply…
          </Button>
        )}
      />
      {applying !== null && (
        <ApplyPresetDialog preset={applying} onClose={() => setApplying(null)} />
      )}
    </Section>
  );
}
