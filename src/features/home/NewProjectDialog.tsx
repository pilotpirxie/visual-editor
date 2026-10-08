import { useState, type JSX } from 'react';
import { describeError } from '../../app/errors';
import { createBlankProject, UNTITLED_PROJECT_TITLE } from '../../app/projectFactory';
import { editorPath, navigate } from '../../app/router';
import type { DesignSystemPreset, Project } from '../../app/types';
import { putProject } from '../../persistence/db';
import { BUILTIN_PRESETS } from '../../presets/presets';
import { instantiateStarter, type StarterInfo } from '../../starters/starters';
import {
  Button,
  closeDialogOf,
  Dialog,
  DialogActions,
  DialogBody,
  Field,
  TabPanel,
  Tabs,
  TextInput,
} from '../../../packages/ui/src';
import { PresetPicker } from '../design-system/PresetList';
import { StarterGallery } from './StarterGallery';
import '../design-system/designSystem.css';
import './home.css';

type NewProjectTab = 'blank' | 'starters';

const TITLE_ID = 've-new-project-title';
const TABS_ID = 've-new-project';

const TABS: { id: NewProjectTab; label: string }[] = [
  { id: 'blank', label: 'Blank' },
  { id: 'starters', label: 'Starters' },
];

function chosenTitle(title: string, fallback: string): string {
  const trimmed = title.trim();
  if (trimmed === '') return fallback;
  return trimmed;
}

function isNewProjectTab(id: string): id is NewProjectTab {
  return id === 'blank' || id === 'starters';
}

export function NewProjectDialog({ onClose }: { onClose(): void }): JSX.Element {
  const [tab, setTab] = useState<NewProjectTab>('blank');
  const [title, setTitle] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

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
    <Dialog labelId={TITLE_ID} size="wide" className="ve-new-project" onClose={onClose}>
      <DialogBody titleId={TITLE_ID} title="New project">
        <Field id="ve-new-project-name" label="Site name" error={error}>
          <TextInput
            id="ve-new-project-name"
            value={title}
            placeholder={tab === 'blank' ? UNTITLED_PROJECT_TITLE : 'The starter’s name'}
            onChange={(event) => setTitle(event.target.value)}
          />
        </Field>
        <Tabs
          label="Start from"
          idPrefix={TABS_ID}
          tabs={TABS}
          activeId={tab}
          onChange={(id) => {
            if (isNewProjectTab(id)) setTab(id);
          }}
        />
        <TabPanel idPrefix={TABS_ID} activeId={tab} className="ve-new-project-panel">
          {tab === 'blank' && (
            <PresetPicker
              label="Design presets"
              presets={BUILTIN_PRESETS}
              isDisabled={isCreating}
              onPick={startBlank}
            />
          )}
          {tab === 'starters' && (
            <StarterGallery isDisabled={isCreating} onUse={startFromStarter} />
          )}
        </TabPanel>
        <DialogActions>
          <Button onClick={(event) => closeDialogOf(event.currentTarget)}>Cancel</Button>
        </DialogActions>
      </DialogBody>
    </Dialog>
  );
}
