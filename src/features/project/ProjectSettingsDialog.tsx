import type { JSX, ReactNode } from 'react';
import {
  FAVICON_TYPES,
  projectImageSet,
  settingError,
  settingSet,
  siteIndexingSet,
  SOCIAL_IMAGE_TYPES,
  type EditKind,
  type SettingKey,
} from '../../app/projectSlice';
import { dispatch, useStore } from '../../app/store';
import type { Field as FieldSchema } from '../../components/types';
import { FieldControl } from '../properties/FieldControl';
import { ImageUploadInput } from '../properties/ImageUploadInput';
import { SOCIAL_IMAGE_TYPE_ERROR } from '../properties/PageSettingsPanel';
import { useSection } from '../editor/useSection';
import { languageOptions } from './languages';
import {
  Button,
  closeDialogOf,
  Dialog,
  DialogActions,
  DialogBody,
  DraftInput,
  Field,
  Section,
  Switch,
} from '../../../packages/ui/src';

const TITLE_ID = 've-project-settings-title';
const BASE_URL_ID = 've-project-base-url';

const TITLE_FIELD: FieldSchema = {
  name: 'title',
  label: 'Site title',
  type: 'text',
  default: '',
  required: true,
};

const DESCRIPTION_FIELD: FieldSchema = {
  name: 'description',
  label: 'Description',
  type: 'textarea',
  default: '',
};

const TITLE_TEMPLATE_FIELD: FieldSchema = {
  name: 'titleTemplate',
  label: 'Page title template',
  type: 'text',
  default: '',
  required: true,
};

function languageField(language: string): FieldSchema {
  return {
    name: 'language',
    label: 'Language',
    type: 'select',
    default: 'en',
    options: languageOptions(language),
  };
}

function changeSetting(key: SettingKey): (value: unknown, kind: EditKind) => void {
  return (value, kind) => {
    if (typeof value === 'string') dispatch(settingSet(key, value, kind));
  };
}

function SettingsSection({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}): JSX.Element {
  const section = useSection(`settings:${id}`);
  return (
    <Section title={title} isOpen={section.isOpen} onToggle={section.onToggle}>
      {children}
    </Section>
  );
}

export function ProjectSettingsDialog({ onClose }: { onClose(): void }): JSX.Element {
  const settings = useStore((state) => state.project.settings);
  const assets = useStore((state) => state.project.assets);
  const favicon =
    settings.faviconAssetId === undefined ? undefined : assets[settings.faviconAssetId];
  const socialImage =
    settings.socialImageAssetId === undefined ? undefined : assets[settings.socialImageAssetId];

  return (
    <Dialog labelId={TITLE_ID} size="wide" onClose={onClose}>
      <DialogBody titleId={TITLE_ID} title="Project settings" className="ve-settings-body">
        <div className="ve-settings-sections">
          <SettingsSection id="site" title="Site">
            <FieldControl
              field={TITLE_FIELD}
              value={settings.title}
              path="project-title"
              onChange={changeSetting('title')}
            />
            <FieldControl
              field={DESCRIPTION_FIELD}
              value={settings.description}
              path="project-description"
              onChange={changeSetting('description')}
            />
            <FieldControl
              field={languageField(settings.language)}
              value={settings.language}
              path="project-language"
              onChange={changeSetting('language')}
            />
            <div data-field-path="project-base-url">
              <Field id={BASE_URL_ID} label="Base URL">
                <DraftInput
                  id={BASE_URL_ID}
                  value={settings.baseUrl ?? ''}
                  placeholder="https://example.com"
                  validate={(text) => settingError('baseUrl', text)}
                  onCommit={(text) => dispatch(settingSet('baseUrl', text, 'continuous'))}
                />
              </Field>
            </div>
          </SettingsSection>
          <SettingsSection id="sharing" title="Search and sharing">
            <FieldControl
              field={TITLE_TEMPLATE_FIELD}
              value={settings.titleTemplate}
              path="project-title-template"
              onChange={changeSetting('titleTemplate')}
            />
            <Switch
              id="ve-project-indexable"
              label="Let search engines index this site"
              checked={settings.indexable}
              onChange={(event) => dispatch(siteIndexingSet(event.target.checked))}
            />
            <ImageUploadInput
              id="ve-project-favicon"
              label="Favicon"
              asset={favicon}
              accept={FAVICON_TYPES}
              typeError="Use a PNG, SVG or ICO image"
              shape="icon"
              onChange={(upload) => dispatch(projectImageSet('favicon', upload))}
            />
            <ImageUploadInput
              id="ve-project-social-image"
              label="Default social image"
              asset={socialImage}
              accept={SOCIAL_IMAGE_TYPES}
              typeError={SOCIAL_IMAGE_TYPE_ERROR}
              shape="social"
              onChange={(upload) => dispatch(projectImageSet('socialImage', upload))}
            />
          </SettingsSection>
        </div>
        <DialogActions>
          <Button variant="primary" onClick={(event) => closeDialogOf(event.currentTarget)}>
            Done
          </Button>
        </DialogActions>
      </DialogBody>
    </Dialog>
  );
}
