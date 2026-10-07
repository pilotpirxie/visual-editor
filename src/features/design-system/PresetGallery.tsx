import { useEffect, useRef, useState, type ChangeEvent, type JSX } from 'react';
import { noticeShown } from '../../app/editorSlice';
import { describeError } from '../../app/errors';
import { slugify } from '../../app/slugs';
import { dispatch, store, useStore } from '../../app/store';
import type { DesignSystemPreset } from '../../app/types';
import { iconSetInfo } from '../../../packages/icon-data/src/sets';
import {
  BUILTIN_PRESETS,
  PRESET_GROUP_LABELS,
  PRESET_GROUPS,
  type PresetGroup,
} from '../../presets/presets';
import { closeDialogOf, Dialog } from '../editor/Dialog';
import { downloadBlob } from '../export/download';
import {
  applyPresetGroups,
  importPresetText,
  loadUserPresets,
  presetFileText,
  previewPreset,
  removeUserPreset,
  saveUserPreset,
} from './presetActions';
import { PresetSpecimen } from './PresetSpecimen';

const SWATCH_TOKENS = [
  '--color-primary',
  '--color-background',
  '--color-surface',
  '--color-text',
  '--color-border',
];

function reportFailure(action: string, error: unknown): void {
  console.error(`${action} failed`, error);
  dispatch(noticeShown('error', `${action} failed: ${describeError(error)}`));
}

function fontSummary(preset: DesignSystemPreset): string {
  const families = [...new Set(preset.designSystem.fonts.map((font) => font.family))];
  return families.length === 0 ? 'System fonts' : families.join(' / ');
}

function ApplyPresetDialog({
  preset,
  onClose,
}: {
  preset: DesignSystemPreset;
  onClose(): void;
}): JSX.Element {
  const [groups, setGroups] = useState<PresetGroup[]>([...PRESET_GROUPS]);
  const titleId = 've-apply-preset-title';

  function toggle(group: PresetGroup, isChecked: boolean): void {
    setGroups((current) =>
      isChecked ? [...current, group] : current.filter((item) => item !== group),
    );
  }

  function apply(element: Element): void {
    dispatch(applyPresetGroups(preset, groups))
      .then(() => closeDialogOf(element))
      .catch((error: unknown) => reportFailure('Applying the preset', error));
  }

  return (
    <Dialog labelId={titleId} onClose={onClose}>
      <div className="ve-dialog-body">
        <h2 id={titleId} className="ve-properties-title">
          Apply “{preset.name}”
        </h2>
        <fieldset className="ve-preset-groups">
          <legend>Take these parts of the preset</legend>
          {PRESET_GROUPS.map((group) => (
            <label key={group} className="ve-check">
              <input
                type="checkbox"
                checked={groups.includes(group)}
                onChange={(event) => toggle(group, event.target.checked)}
              />
              {PRESET_GROUP_LABELS[group]}
            </label>
          ))}
        </fieldset>
        <p className="ve-control-help">You can undo this in one step.</p>
        <div className="ve-dialog-actions">
          <button
            type="button"
            className="ve-button ve-button--outline"
            onClick={(event) => closeDialogOf(event.currentTarget)}
          >
            Cancel
          </button>
          <button
            type="button"
            className="ve-button ve-button--primary"
            disabled={groups.length === 0}
            onClick={(event) => apply(event.currentTarget)}
          >
            Apply
          </button>
        </div>
      </div>
    </Dialog>
  );
}

function SavePresetDialog({
  onSaved,
  onClose,
}: {
  onSaved(preset: DesignSystemPreset): void;
  onClose(): void;
}): JSX.Element {
  const [name, setName] = useState('');
  const titleId = 've-save-preset-title';

  function save(element: Element): void {
    saveUserPreset(name, store.getState().project.designSystem)
      .then((preset) => {
        onSaved(preset);
        closeDialogOf(element);
      })
      .catch((error: unknown) => reportFailure('Saving the preset', error));
  }

  return (
    <Dialog labelId={titleId} onClose={onClose}>
      <form
        className="ve-dialog-body"
        onSubmit={(event) => {
          event.preventDefault();
          if (name.trim() !== '') save(event.currentTarget);
        }}
      >
        <h2 id={titleId} className="ve-properties-title">
          Save as preset
        </h2>
        <div className="ve-control">
          <label className="ve-control-label" htmlFor="ve-preset-name">
            Preset name
          </label>
          <input
            id="ve-preset-name"
            className="ve-input"
            value={name}
            autoFocus
            onChange={(event) => setName(event.target.value)}
          />
        </div>
        <div className="ve-dialog-actions">
          <button
            type="button"
            className="ve-button ve-button--outline"
            onClick={(event) => closeDialogOf(event.currentTarget)}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="ve-button ve-button--primary"
            disabled={name.trim() === ''}
          >
            Save preset
          </button>
        </div>
      </form>
    </Dialog>
  );
}

type PresetCardProps = {
  preset: DesignSystemPreset;
  isPreviewing: boolean;
  onPreview(preset: DesignSystemPreset | null): void;
  onApply(preset: DesignSystemPreset): void;
  onDelete?(preset: DesignSystemPreset): void;
};

export function PresetSummary({ preset }: { preset: DesignSystemPreset }): JSX.Element {
  const { tokens, iconSet } = preset.designSystem;
  return (
    <>
      <div className="ve-preset-swatches" aria-hidden="true">
        {SWATCH_TOKENS.map((name) => (
          <span key={name} style={{ background: tokens[name]?.value }} />
        ))}
      </div>
      <strong>{preset.name}</strong>
      <span className="ve-muted">
        {fontSummary(preset)} · {iconSetInfo(iconSet)?.label ?? iconSet}
      </span>
    </>
  );
}

function PresetCard({
  preset,
  isPreviewing,
  onPreview,
  onApply,
  onDelete,
}: PresetCardProps): JSX.Element {
  const currentPresetId = useStore((state) => state.project.designSystem.presetId);
  return (
    <li
      className="ve-preset-card"
      data-current={currentPresetId === preset.id || undefined}
      onPointerEnter={(event) => {
        if (event.pointerType === 'mouse') onPreview(preset);
      }}
      onPointerLeave={(event) => {
        if (event.pointerType === 'mouse') onPreview(null);
      }}
    >
      <PresetSummary preset={preset} />
      {preset.description !== '' && <span className="ve-muted">{preset.description}</span>}
      <div className="ve-preset-actions">
        <button
          type="button"
          className="ve-button ve-button--outline"
          aria-pressed={isPreviewing}
          aria-label={`Preview ${preset.name}`}
          onClick={() => onPreview(isPreviewing ? null : preset)}
        >
          Preview
        </button>
        <button
          type="button"
          className="ve-button ve-button--primary"
          aria-label={`Apply ${preset.name}`}
          onClick={() => onApply(preset)}
        >
          Apply…
        </button>
        {preset.source === 'user' && (
          <button
            type="button"
            className="ve-button"
            aria-label={`Export ${preset.name}`}
            onClick={() => {
              const file = new Blob([presetFileText(preset)], { type: 'application/json' });
              downloadBlob(file, `${slugify(preset.name)}-preset.json`);
            }}
          >
            Export
          </button>
        )}
        {onDelete !== undefined && (
          <button
            type="button"
            className="ve-button"
            aria-label={`Delete ${preset.name}`}
            onClick={() => onDelete(preset)}
          >
            Delete
          </button>
        )}
      </div>
    </li>
  );
}

export function PresetGallery(): JSX.Element {
  const [userPresets, setUserPresets] = useState<DesignSystemPreset[]>([]);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [applying, setApplying] = useState<DesignSystemPreset | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const previewIdRef = useRef<string | null>(null);
  const importRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let isCancelled = false;
    loadUserPresets()
      .then((presets) => {
        if (!isCancelled) setUserPresets(presets);
      })
      .catch((error: unknown) => reportFailure('Loading your presets', error));
    return () => {
      isCancelled = true;
    };
  }, []);

  function preview(preset: DesignSystemPreset | null): void {
    const id = preset === null ? null : preset.id;
    previewIdRef.current = id;
    setPreviewId(id);
    dispatch(previewPreset(preset, () => previewIdRef.current === id)).catch((error: unknown) =>
      reportFailure('Previewing the preset', error),
    );
  }

  function remove(preset: DesignSystemPreset): void {
    removeUserPreset(preset.id)
      .then(() => setUserPresets((current) => current.filter((item) => item.id !== preset.id)))
      .catch((error: unknown) => reportFailure('Deleting the preset', error));
  }

  async function importFile(event: ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file === undefined) return;
    try {
      const preset = await importPresetText(await file.text());
      setUserPresets((current) => [...current, preset]);
      dispatch(noticeShown('info', `Added the preset “${preset.name}”.`));
    } catch (error) {
      reportFailure('Importing the preset', error);
    }
  }

  function card(preset: DesignSystemPreset, canDelete: boolean): JSX.Element {
    return (
      <PresetCard
        key={preset.id}
        preset={preset}
        isPreviewing={previewId === preset.id}
        onPreview={preview}
        onApply={setApplying}
        onDelete={canDelete ? remove : undefined}
      />
    );
  }

  return (
    <div className="ve-preset-gallery">
      <ul className="ve-preset-list" aria-label="Presets">
        {BUILTIN_PRESETS.map((preset) => card(preset, false))}
      </ul>
      <h4 className="ve-group-title">My presets</h4>
      {userPresets.length === 0 ? (
        <p className="ve-muted">Save the current design system to reuse it in other projects.</p>
      ) : (
        <ul className="ve-preset-list" aria-label="My presets">
          {userPresets.map((preset) => card(preset, true))}
        </ul>
      )}
      <div className="ve-preset-actions">
        <button
          type="button"
          className="ve-button ve-button--outline"
          onClick={() => setIsSaving(true)}
        >
          Save current as preset…
        </button>
        <button
          type="button"
          className="ve-button ve-button--outline"
          onClick={() => importRef.current?.click()}
        >
          Import preset…
        </button>
        <input
          ref={importRef}
          className="ve-visually-hidden"
          type="file"
          accept=".json,application/json"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(event) => void importFile(event)}
        />
      </div>
      <details className="ve-design-details">
        <summary>Specimen</summary>
        <PresetSpecimen />
      </details>
      {applying !== null && (
        <ApplyPresetDialog preset={applying} onClose={() => setApplying(null)} />
      )}
      {isSaving && (
        <SavePresetDialog
          onSaved={(preset) => setUserPresets((current) => [...current, preset])}
          onClose={() => setIsSaving(false)}
        />
      )}
    </div>
  );
}
