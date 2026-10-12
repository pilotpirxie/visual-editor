import { useEffect, useRef, useState, type JSX } from 'react';
import { setAppearance, useAppearance } from '../../app/appearance';
import {
  DEVICE_MODES,
  updateAppSettings,
  useAppSettings,
  type AppSettings,
} from '../../app/appSettings';
import { describeError } from '../../app/errors';
import { AssistantError, listImageModels, listModels } from '../assistant/openRouter';
import { deviceOptionLabel } from '../editor/DeviceToggle';
import { modelDetails, ModelPicker } from './ModelPicker';
import './settings.css';
import {
  Button,
  closeDialogOf,
  Dialog,
  DialogActions,
  DialogBody,
  Field,
  Select,
  Switch,
  TabPanel,
  Tabs,
  TextInput,
} from '../../../packages/ui/src';

export type AppSettingsTab = 'general' | 'assistant';

type ModelList<Model> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; models: Model[] }
  | { status: 'failed'; message: string };

const TITLE_ID = 've-app-settings-title';
const TABS_ID = 've-app-settings';
const DEVICE_ID = 've-app-settings-device';
const KEY_ID = 've-app-settings-key';
const KEY_NOTE_ID = 've-app-settings-key-note';
const EFFORT_ID = 've-app-settings-effort';
const DEFAULT_EFFORT = '';

const TABS: { id: AppSettingsTab; label: string }[] = [
  { id: 'general', label: 'General' },
  { id: 'assistant', label: 'Assistant' },
];

const DEVICE_OPTIONS = DEVICE_MODES.map((mode) => ({
  value: mode,
  label: deviceOptionLabel(mode),
}));

function isSettingsTab(id: string): id is AppSettingsTab {
  return id === 'general' || id === 'assistant';
}

const EFFORT_LABELS: Record<string, string> = {
  none: 'None',
  minimal: 'Minimal',
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  xhigh: 'Extra high',
  max: 'Maximum',
};

function effortLabel(effort: string): string {
  return EFFORT_LABELS[effort] ?? effort;
}

type ModelLoader<Model> = {
  list: ModelList<Model>;
  loadModels(key: string): Promise<void>;
};

function useModelList<Model>(
  listFor: (key: string, signal: AbortSignal) => Promise<Model[]>,
  failureLog: string,
): ModelLoader<Model> {
  const [list, setList] = useState<ModelList<Model>>({ status: 'idle' });
  const loadingRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => loadingRef.current?.abort();
  }, []);

  async function loadModels(key: string): Promise<void> {
    loadingRef.current?.abort();
    const loading = new AbortController();
    loadingRef.current = loading;
    setList({ status: 'loading' });
    try {
      const models = await listFor(key.trim(), loading.signal);
      setList({ status: 'ready', models });
    } catch (error) {
      if (error instanceof AssistantError && error.kind === 'cancelled') return;
      console.error(failureLog, error);
      setList({ status: 'failed', message: describeError(error) });
    }
  }

  return { list, loadModels };
}

function ModelListFailure<Model>({ list }: { list: ModelList<Model> }): JSX.Element | null {
  if (list.status !== 'failed') return null;
  return (
    <p className="ui-field-error" role="alert">
      {list.message}
    </p>
  );
}

function GeneralSettings({ settings }: { settings: AppSettings }): JSX.Element {
  const isDark = useAppearance() === 'dark';
  return (
    <>
      <Switch
        label="Dark mode"
        checked={isDark}
        onChange={(event) => setAppearance(event.currentTarget.checked ? 'dark' : 'light')}
      />
      <Field id={DEVICE_ID} label="Canvas size when a project opens">
        <Select
          id={DEVICE_ID}
          value={settings.deviceOnOpen}
          options={DEVICE_OPTIONS}
          onChange={(event) => {
            const picked = DEVICE_MODES.find((mode) => mode === event.target.value);
            if (picked !== undefined) updateAppSettings({ deviceOnOpen: picked });
          }}
        />
      </Field>
      <Switch
        label="Ask before deleting a block"
        checked={settings.shouldConfirmBlockDelete}
        onChange={(event) =>
          updateAppSettings({ shouldConfirmBlockDelete: event.currentTarget.checked })
        }
      />
    </>
  );
}

function AssistantSettings({ settings }: { settings: AppSettings }): JSX.Element {
  const [isKeyShown, setIsKeyShown] = useState(false);
  const { list, loadModels } = useModelList(listModels, 'The OpenRouter model list did not load');
  const { openRouterKey, assistantModel, assistantEffort } = settings;
  const efforts = assistantModel?.efforts ?? [];

  const effortOptions = [
    { value: DEFAULT_EFFORT, label: 'Model default' },
    ...efforts.map((effort) => ({ value: effort, label: effortLabel(effort) })),
  ];

  return (
    <>
      <p className="ui-muted">
        The assistant builds a site from your description on the home screen. It runs on your own
        OpenRouter account.
      </p>
      <Field id={KEY_ID} label="OpenRouter API key">
        <div className="ve-settings-key">
          <TextInput
            id={KEY_ID}
            type={isKeyShown ? 'text' : 'password'}
            value={openRouterKey}
            autoComplete="off"
            spellCheck={false}
            aria-describedby={KEY_NOTE_ID}
            onChange={(event) => updateAppSettings({ openRouterKey: event.target.value })}
          />
          <Button aria-pressed={isKeyShown} onClick={() => setIsKeyShown(!isKeyShown)}>
            {isKeyShown ? 'Hide' : 'Show'}
          </Button>
          <Button
            disabled={openRouterKey === ''}
            onClick={() => updateAppSettings({ openRouterKey: '' })}
          >
            Remove
          </Button>
        </div>
      </Field>
      <p id={KEY_NOTE_ID} className="ui-muted">
        The key is kept in this browser and sent only to openrouter.ai. It is never saved in
        projects or exported sites.
      </p>
      <div className="ve-settings-model">
        <div>
          <p className="ui-field-label">Model</p>
          <p>{assistantModel === null ? 'No model chosen' : assistantModel.name}</p>
          {assistantModel !== null && <p className="ui-muted">{modelDetails(assistantModel)}</p>}
        </div>
        <Button
          disabled={openRouterKey.trim() === '' || list.status === 'loading'}
          onClick={() => void loadModels(openRouterKey)}
        >
          {list.status === 'ready' ? 'Reload models' : 'Load models'}
        </Button>
      </div>
      <div role="status">
        {list.status === 'loading' && <p className="ui-muted">Loading models…</p>}
        {list.status === 'ready' && (
          <p className="ui-muted">{list.models.length} models can build sites.</p>
        )}
      </div>
      <ModelListFailure list={list} />
      {list.status === 'ready' && (
        <ModelPicker
          label="Models"
          models={list.models.map((model) => ({ ...model, details: modelDetails(model) }))}
          currentId={assistantModel?.id ?? null}
          onPick={(id) => {
            const picked = list.models.find((model) => model.id === id);
            if (picked !== undefined) {
              updateAppSettings({ assistantModel: picked, assistantEffort: null });
            }
          }}
        />
      )}
      <Field id={EFFORT_ID} label="Reasoning effort">
        <Select
          id={EFFORT_ID}
          value={assistantEffort ?? DEFAULT_EFFORT}
          options={effortOptions}
          disabled={efforts.length === 0}
          onChange={(event) => {
            const picked = event.target.value;
            updateAppSettings({ assistantEffort: picked === DEFAULT_EFFORT ? null : picked });
          }}
        />
      </Field>
      {assistantModel !== null && efforts.length === 0 && (
        <p className="ui-muted">This model has no effort setting.</p>
      )}
      <ImageModelSettings settings={settings} />
    </>
  );
}

function ImageModelSettings({ settings }: { settings: AppSettings }): JSX.Element {
  const { list, loadModels } = useModelList(
    listImageModels,
    'The OpenRouter image model list did not load',
  );
  const { openRouterKey, imageModel } = settings;

  return (
    <>
      <div className="ve-settings-model">
        <div>
          <p className="ui-field-label">Image model</p>
          <p>{imageModel === null ? 'No image model chosen' : imageModel.name}</p>
        </div>
        <div className="ve-settings-model-actions">
          <Button
            disabled={openRouterKey.trim() === '' || list.status === 'loading'}
            onClick={() => void loadModels(openRouterKey)}
          >
            {list.status === 'ready' ? 'Reload image models' : 'Load image models'}
          </Button>
          <Button
            disabled={imageModel === null}
            onClick={() => updateAppSettings({ imageModel: null })}
          >
            Remove image model
          </Button>
        </div>
      </div>
      <p className="ui-muted">
        Optional. With an image model the assistant can create images for a new site. Images are
        billed to your OpenRouter account.
      </p>
      <div role="status">
        {list.status === 'loading' && <p className="ui-muted">Loading image models…</p>}
        {list.status === 'ready' && (
          <p className="ui-muted">
            {list.models.length === 1
              ? '1 model can create images.'
              : `${list.models.length} models can create images.`}
          </p>
        )}
      </div>
      <ModelListFailure list={list} />
      {list.status === 'ready' && (
        <ModelPicker
          label="Image models"
          models={list.models.map((model) => ({ ...model, details: model.id }))}
          currentId={imageModel?.id ?? null}
          onPick={(id) => {
            const picked = list.models.find((model) => model.id === id);
            if (picked !== undefined) updateAppSettings({ imageModel: picked });
          }}
        />
      )}
    </>
  );
}

type AppSettingsDialogProps = { initialTab?: AppSettingsTab; onClose(): void };

export function AppSettingsDialog({
  initialTab = 'general',
  onClose,
}: AppSettingsDialogProps): JSX.Element {
  const [tab, setTab] = useState<AppSettingsTab>(initialTab);
  const settings = useAppSettings();

  return (
    <Dialog labelId={TITLE_ID} size="wide" className="ve-app-settings" onClose={onClose}>
      <DialogBody titleId={TITLE_ID} title="App settings">
        <Tabs
          label="App settings"
          idPrefix={TABS_ID}
          tabs={TABS}
          activeId={tab}
          onChange={(id) => {
            if (isSettingsTab(id)) setTab(id);
          }}
        />
        <TabPanel idPrefix={TABS_ID} activeId={tab} className="ve-app-settings-panel">
          {tab === 'general' && <GeneralSettings settings={settings} />}
          {tab === 'assistant' && <AssistantSettings settings={settings} />}
        </TabPanel>
        <DialogActions>
          <Button variant="primary" onClick={(event) => closeDialogOf(event.currentTarget)}>
            Done
          </Button>
        </DialogActions>
      </DialogBody>
    </Dialog>
  );
}
