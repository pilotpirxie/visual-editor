import type { JSX } from 'react';
import {
  FAVICON_TYPES,
  projectImageSet,
  settingError,
  settingSet,
  SOCIAL_IMAGE_TYPES,
  type EditKind,
  type SettingKey,
} from '../../app/projectSlice';
import { dispatch, useStore } from '../../app/store';
import type { Field } from '../../components/types';
import { applyTitleTemplate } from '../../render/pageHead';
import { closeDialogOf, Dialog } from '../editor/Dialog';
import { DraftInput } from '../properties/DraftInput';
import { FieldControl } from '../properties/FieldControl';
import { ImageUploadInput } from '../properties/ImageUploadInput';
import { SOCIAL_IMAGE_TYPE_ERROR } from '../properties/PageSettingsPanel';
import { languageOptions } from './languages';

const TITLE_ID = 've-project-settings-title';
const BASE_URL_ID = 've-project-base-url';
const EXAMPLE_PAGE_TITLE = 'About';

const TITLE_FIELD: Field = {
  name: 'title',
  label: 'Site title',
  type: 'text',
  default: '',
  required: true,
  help: 'Shown in the editor and used as the site name on every page.',
};

const DESCRIPTION_FIELD: Field = {
  name: 'description',
  label: 'Description',
  type: 'textarea',
  default: '',
  help: 'Used as the meta description of pages that have none of their own.',
};

function languageField(language: string): Field {
  return {
    name: 'language',
    label: 'Language',
    type: 'select',
    default: 'en',
    options: languageOptions(language),
    help: 'The language your pages are written in.',
  };
}

function titleTemplateField(template: string, siteTitle: string): Field {
  const example = applyTitleTemplate(template, EXAMPLE_PAGE_TITLE, siteTitle);
  return {
    name: 'titleTemplate',
    label: 'Title template',
    type: 'text',
    default: '',
    required: true,
    help: `Use {{page.title}} and {{site.title}}. Example: “${example}”.`,
  };
}

function changeSetting(key: SettingKey): (value: unknown, kind: EditKind) => void {
  return (value, kind) => {
    if (typeof value === 'string') dispatch(settingSet(key, value, kind));
  };
}

export function ProjectSettingsDialog({ onClose }: { onClose(): void }): JSX.Element {
  const settings = useStore((state) => state.project.settings);
  const assets = useStore((state) => state.project.assets);
  const favicon =
    settings.faviconAssetId === undefined ? undefined : assets[settings.faviconAssetId];
  const socialImage =
    settings.socialImageAssetId === undefined ? undefined : assets[settings.socialImageAssetId];

  return (
    <Dialog labelId={TITLE_ID} className="ve-dialog--wide" onClose={onClose}>
      <div className="ve-dialog-body">
        <h2 id={TITLE_ID} className="ve-properties-title">
          Project settings
        </h2>
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
        <div className="ve-control" data-field-path="project-base-url">
          <label className="ve-control-label" htmlFor={BASE_URL_ID}>
            Base URL
          </label>
          <DraftInput
            id={BASE_URL_ID}
            label="Base URL"
            value={settings.baseUrl ?? ''}
            validate={(text) => settingError('baseUrl', text)}
            onCommit={(text) => dispatch(settingSet('baseUrl', text, 'continuous'))}
          />
          <p className="ve-control-help">
            Where the site will live, for example https://example.com. Needed for canonical links
            and absolute social image addresses.
          </p>
        </div>
        <FieldControl
          field={titleTemplateField(settings.titleTemplate, settings.title)}
          value={settings.titleTemplate}
          path="project-title-template"
          onChange={changeSetting('titleTemplate')}
        />
        <ImageUploadInput
          id="ve-project-favicon"
          label="Favicon"
          help="A square PNG, SVG or ICO image shown in browser tabs."
          asset={favicon}
          accept={FAVICON_TYPES}
          typeError="Use a PNG, SVG or ICO image"
          shape="icon"
          onChange={(upload) => dispatch(projectImageSet('favicon', upload))}
        />
        <ImageUploadInput
          id="ve-project-social-image"
          label="Default social image"
          help="Shown when a page without its own social image is shared. 1200 × 630 px works best."
          asset={socialImage}
          accept={SOCIAL_IMAGE_TYPES}
          typeError={SOCIAL_IMAGE_TYPE_ERROR}
          shape="social"
          onChange={(upload) => dispatch(projectImageSet('socialImage', upload))}
        />
        <div className="ve-dialog-actions">
          <button
            type="button"
            className="ve-button ve-button--primary"
            onClick={(event) => closeDialogOf(event.currentTarget)}
          >
            Done
          </button>
        </div>
      </div>
    </Dialog>
  );
}
