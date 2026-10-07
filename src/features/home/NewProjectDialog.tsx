import { useEffect, useState, type JSX } from 'react';
import { describeError } from '../../app/errors';
import { createBlankProject, UNTITLED_PROJECT_TITLE } from '../../app/projectFactory';
import { editorPath, navigate } from '../../app/router';
import type { DesignSystemPreset, Project } from '../../app/types';
import { putProject } from '../../persistence/db';
import { BUILTIN_PRESETS } from '../../presets/presets';
import { instantiateStarter, type StarterInfo } from '../../starters/starters';
import { loadUserPresets } from '../design-system/presetActions';
import { PresetSummary } from '../design-system/PresetGallery';
import { closeDialogOf, Dialog } from '../editor/Dialog';
import { StarterGallery } from './StarterGallery';
import '../design-system/designSystem.css';
import './home.css';

type NewProjectTab = 'blank' | 'starters';

const TITLE_ID = 've-new-project-title';

const TABS: { id: NewProjectTab; label: string }[] = [
  { id: 'blank', label: 'Blank' },
  { id: 'starters', label: 'Starters' },
];

function chosenTitle(title: string, fallback: string): string {
  const trimmed = title.trim();
  if (trimmed === '') return fallback;
  return trimmed;
}

export function NewProjectDialog({ onClose }: { onClose(): void }): JSX.Element {
  const [tab, setTab] = useState<NewProjectTab>('blank');
  const [title, setTitle] = useState('');
  const [userPresets, setUserPresets] = useState<DesignSystemPreset[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    let isCancelled = false;
    async function load(): Promise<void> {
      try {
        const presets = await loadUserPresets();
        if (!isCancelled) setUserPresets(presets);
      } catch (loadError) {
        console.error('Could not load the saved presets', loadError);
        if (!isCancelled) setError(`Could not load your presets: ${describeError(loadError)}`);
      }
    }
    void load();
    return () => {
      isCancelled = true;
    };
  }, []);

  async function create(project: Project): Promise<void> {
    setError(null);
    setIsCreating(true);
    try {
      await putProject(project);
    } catch (createError) {
      console.error('Could not create a project', createError);
      setError(`Could not create a project: ${describeError(createError)}`);
      setIsCreating(false);
      return;
    }
    onClose();
    navigate(editorPath(project.id, project.pages.homePageId));
  }

  function startBlank(preset: DesignSystemPreset): void {
    void create(createBlankProject(chosenTitle(title, UNTITLED_PROJECT_TITLE), preset));
  }

  function startFromStarter(starter: StarterInfo, project: Project): void {
    const starterTitle = chosenTitle(title, project.settings.title);
    void create(instantiateStarter(starter, project, starterTitle));
  }

  return (
    <Dialog labelId={TITLE_ID} className="ve-new-project" onClose={onClose}>
      <div className="ve-dialog-body">
        <h2 id={TITLE_ID} className="ve-properties-title">
          New project
        </h2>
        <div className="ve-control">
          <label className="ve-control-label" htmlFor="ve-new-project-name">
            Site name
          </label>
          <input
            id="ve-new-project-name"
            className="ve-input"
            value={title}
            placeholder={tab === 'blank' ? UNTITLED_PROJECT_TITLE : 'The starter’s name'}
            onChange={(event) => setTitle(event.target.value)}
          />
        </div>
        {error !== null && (
          <p className="ve-home-error" role="alert">
            {error}
          </p>
        )}
        <div className="ve-tabs" role="tablist" aria-label="Start from">
          {TABS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              role="tab"
              id={`ve-new-project-tab-${id}`}
              aria-selected={tab === id}
              aria-controls="ve-new-project-panel"
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          ))}
        </div>
        <div
          className="ve-new-project-panel"
          role="tabpanel"
          id="ve-new-project-panel"
          aria-labelledby={`ve-new-project-tab-${tab}`}
        >
          {tab === 'blank' && (
            <>
              <p className="ve-muted">Pick a design system. You can change any part of it later.</p>
              <ul className="ve-new-presets" aria-label="Design presets">
                {[...BUILTIN_PRESETS, ...userPresets].map((preset) => (
                  <li key={preset.id}>
                    <button
                      type="button"
                      className="ve-preset-card ve-new-preset"
                      aria-label={`Start with ${preset.name}`}
                      disabled={isCreating}
                      onClick={() => startBlank(preset)}
                    >
                      <PresetSummary preset={preset} />
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
          {tab === 'starters' && (
            <StarterGallery isDisabled={isCreating} onUse={startFromStarter} />
          )}
        </div>
        <div className="ve-dialog-actions">
          <button
            type="button"
            className="ve-button ve-button--outline"
            onClick={(event) => closeDialogOf(event.currentTarget)}
          >
            Cancel
          </button>
        </div>
      </div>
    </Dialog>
  );
}
