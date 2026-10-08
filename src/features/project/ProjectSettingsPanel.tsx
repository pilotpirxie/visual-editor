import type { JSX } from 'react';
import {
  APP_ICON_TYPES,
  FAVICON_TYPES,
  projectImageSet,
  settingError,
  settingSet,
  siteIndexingSet,
  siteMetaSet,
  SOCIAL_IMAGE_TYPES,
  type EditKind,
  type SettingKey,
} from '../../app/projectSlice';
import { siteMetaError, verificationToken, type SiteMetaKey } from '../../app/settingsRules';
import { dispatch, useStore } from '../../app/store';
import {
  IMAGE_PREVIEW_SIZES,
  OPEN_GRAPH_TYPES,
  SITE_ENTITY_TYPES,
  SITEMAP_FREQUENCIES,
  VERIFICATION_SERVICES,
  type ProjectSettings,
  type SiteMeta,
  type VerificationService,
} from '../../app/types';
import type { Field as FieldSchema } from '../../components/types';
import { FieldControl } from '../properties/FieldControl';
import { ImageUploadInput } from '../properties/ImageUploadInput';
import { SOCIAL_IMAGE_TYPE_ERROR } from '../properties/PageSettingsPanel';
import { languageOptions } from './languages';
import {
  FREQUENCY_OPTIONS,
  IMAGE_PREVIEW_OPTIONS,
  MetaSection,
  MetaSelect,
  MetaTagsInput,
  MetaTextInput,
  OPEN_GRAPH_OPTIONS,
  pickOption,
  PRIORITY_OPTIONS,
  priorityText,
  priorityValue,
  ThemeColorInput,
  type ChoiceOption,
} from './MetaControls';
import { DraftInput, Field, Switch } from '../../../packages/ui/src';

const BASE_URL_ID = 've-project-base-url';
const TEXTAREA_ROWS = 3;
const CODE_ROWS = 6;

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

const PERSON_OPTIONS: ChoiceOption[] = [{ value: 'Person', label: 'A person' }];

const NON_DEFAULT_OPEN_GRAPH_OPTIONS = OPEN_GRAPH_OPTIONS.filter(
  (option) => option.value !== 'website',
);

const VERIFICATION_LABELS: Record<VerificationService, string> = {
  google: 'Google Search Console',
  bing: 'Bing Webmaster Tools',
  yandex: 'Yandex Webmaster',
  pinterest: 'Pinterest',
  facebook: 'Facebook',
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

function setMeta<Key extends SiteMetaKey>(key: Key, value: SiteMeta[Key], kind: EditKind): void {
  dispatch(siteMetaSet(key, value, kind));
}

function validateMeta(key: SiteMetaKey): (text: string) => string | null {
  return (text) => siteMetaError(key, text);
}

function commitText(key: SiteMetaKey): (text: string) => void {
  return (text) => setMeta(key, text, 'continuous');
}

function SiteSection({ settings }: { settings: ProjectSettings }): JSX.Element {
  return (
    <MetaSection id="settings:site" title="Site" isInitiallyOpen>
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
    </MetaSection>
  );
}

function SearchSection({ settings }: { settings: ProjectSettings }): JSX.Element {
  return (
    <MetaSection id="settings:search" title="Search engines" isInitiallyOpen>
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
      <Switch
        id="ve-project-follow"
        label="Let search engines follow links"
        checked={settings.follow !== false}
        onChange={(event) =>
          setMeta('follow', event.target.checked ? undefined : false, 'discrete')
        }
      />
      <Switch
        id="ve-project-snippets"
        label="Show text snippets in results"
        checked={settings.snippets !== false}
        onChange={(event) =>
          setMeta('snippets', event.target.checked ? undefined : false, 'discrete')
        }
      />
      <Switch
        id="ve-project-translate"
        label="Offer translations in results"
        checked={settings.translate !== false}
        onChange={(event) =>
          setMeta('translate', event.target.checked ? undefined : false, 'discrete')
        }
      />
      <MetaSelect
        id="ve-project-image-preview"
        label="Image previews in results"
        value={settings.imagePreview}
        options={IMAGE_PREVIEW_OPTIONS}
        emptyLabel="Search engine default"
        onChange={(value) =>
          setMeta('imagePreview', pickOption(IMAGE_PREVIEW_SIZES, value), 'discrete')
        }
      />
      <MetaTextInput
        id="ve-project-keywords"
        label="Keywords"
        value={settings.keywords}
        placeholder="research, interviews, product"
        validate={validateMeta('keywords')}
        onCommit={commitText('keywords')}
      />
      <MetaTextInput
        id="ve-project-author"
        label="Author"
        value={settings.author}
        validate={validateMeta('author')}
        onCommit={commitText('author')}
      />
    </MetaSection>
  );
}

function SharingSection({ settings }: { settings: ProjectSettings }): JSX.Element {
  const socialImage = useStore((state) =>
    settings.socialImageAssetId === undefined
      ? undefined
      : state.project.assets[settings.socialImageAssetId],
  );
  return (
    <MetaSection id="settings:sharing" title="Social sharing">
      <ImageUploadInput
        id="ve-project-social-image"
        label="Default social image"
        asset={socialImage}
        accept={SOCIAL_IMAGE_TYPES}
        typeError={SOCIAL_IMAGE_TYPE_ERROR}
        shape="social"
        onChange={(upload) => dispatch(projectImageSet('socialImage', upload))}
      />
      <MetaTextInput
        id="ve-project-social-image-alt"
        label="Social image alt text"
        value={settings.socialImageAlt}
        validate={validateMeta('socialImageAlt')}
        onCommit={commitText('socialImageAlt')}
      />
      <MetaSelect
        id="ve-project-og-type"
        label="Content type"
        value={settings.openGraphType}
        options={NON_DEFAULT_OPEN_GRAPH_OPTIONS}
        emptyLabel="Website"
        onChange={(value) =>
          setMeta('openGraphType', pickOption(OPEN_GRAPH_TYPES, value), 'discrete')
        }
      />
      <MetaTextInput
        id="ve-project-twitter-site"
        label="X account of the site"
        value={settings.twitterSite}
        placeholder="@acme"
        validate={validateMeta('twitterSite')}
        onCommit={commitText('twitterSite')}
      />
      <MetaTextInput
        id="ve-project-twitter-creator"
        label="X account of the author"
        value={settings.twitterCreator}
        placeholder="@jane"
        validate={validateMeta('twitterCreator')}
        onCommit={commitText('twitterCreator')}
      />
    </MetaSection>
  );
}

function IconsSection({ settings }: { settings: ProjectSettings }): JSX.Element {
  const assets = useStore((state) => state.project.assets);
  const favicon =
    settings.faviconAssetId === undefined ? undefined : assets[settings.faviconAssetId];
  const appIcon =
    settings.appIconAssetId === undefined ? undefined : assets[settings.appIconAssetId];
  return (
    <MetaSection id="settings:icons" title="Icons and colors">
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
        id="ve-project-app-icon"
        label="App icon, a square PNG of 512 px"
        asset={appIcon}
        accept={APP_ICON_TYPES}
        typeError="Use a PNG image"
        shape="icon"
        onChange={(upload) => dispatch(projectImageSet('appIcon', upload))}
      />
      <ThemeColorInput
        id="ve-project-theme-color"
        label="Browser theme color"
        value={settings.themeColor}
        inheritedValue={undefined}
        emptyLabel="Not set"
        resetLabel="Remove theme color"
        onChange={(value, kind) => setMeta('themeColor', value, kind)}
      />
      <MetaTextInput
        id="ve-project-app-name"
        label="Short name on home screens"
        value={settings.appName}
        placeholder={settings.title}
        validate={validateMeta('appName')}
        onCommit={commitText('appName')}
      />
      <ThemeColorInput
        id="ve-project-background-color"
        label="App background color"
        value={settings.backgroundColor}
        inheritedValue={undefined}
        emptyLabel="Not set"
        resetLabel="Remove background color"
        onChange={(value, kind) => setMeta('backgroundColor', value, kind)}
      />
    </MetaSection>
  );
}

function VerificationSection({ settings }: { settings: ProjectSettings }): JSX.Element {
  const codes = settings.verification ?? {};
  return (
    <MetaSection id="settings:verification" title="Site verification">
      {VERIFICATION_SERVICES.map((service) => (
        <MetaTextInput
          key={service}
          id={`ve-project-verify-${service}`}
          label={VERIFICATION_LABELS[service]}
          value={codes[service]}
          placeholder="Code or meta tag"
          validate={(text) => siteMetaError('verification', { [service]: verificationToken(text) })}
          onCommit={(text) =>
            setMeta('verification', { ...codes, [service]: verificationToken(text) }, 'continuous')
          }
        />
      ))}
    </MetaSection>
  );
}

function CrawlersSection({ settings }: { settings: ProjectSettings }): JSX.Element {
  return (
    <MetaSection id="settings:crawlers" title="Sitemap and robots.txt">
      <MetaSelect
        id="ve-project-frequency"
        label="How often pages change"
        value={settings.sitemapFrequency}
        options={FREQUENCY_OPTIONS}
        emptyLabel="Not set"
        onChange={(value) =>
          setMeta('sitemapFrequency', pickOption(SITEMAP_FREQUENCIES, value), 'discrete')
        }
      />
      <MetaSelect
        id="ve-project-priority"
        label="Page priority"
        value={priorityText(settings.sitemapPriority)}
        options={PRIORITY_OPTIONS}
        emptyLabel="Not set"
        onChange={(value) => setMeta('sitemapPriority', priorityValue(value), 'discrete')}
      />
      <Switch
        id="ve-project-block-ai"
        label="Block AI training crawlers"
        checked={settings.blockAiCrawlers === true}
        onChange={(event) =>
          setMeta('blockAiCrawlers', event.target.checked ? true : undefined, 'discrete')
        }
      />
      <MetaTextInput
        id="ve-project-robots-rules"
        label="Extra robots.txt rules"
        value={settings.robotsRules}
        placeholder="Disallow: /drafts/"
        rows={TEXTAREA_ROWS}
        validate={validateMeta('robotsRules')}
        onCommit={commitText('robotsRules')}
      />
    </MetaSection>
  );
}

function StructuredDataSection({ settings }: { settings: ProjectSettings }): JSX.Element {
  const isEnabled = settings.schemaMarkup !== false;
  return (
    <MetaSection id="settings:schema" title="Structured data">
      <Switch
        id="ve-project-schema"
        label="Describe the site to search engines"
        checked={isEnabled}
        onChange={(event) =>
          setMeta('schemaMarkup', event.target.checked ? undefined : false, 'discrete')
        }
      />
      {isEnabled && (
        <>
          <MetaSelect
            id="ve-project-entity"
            label="The site belongs to"
            value={settings.schemaEntity === 'Organization' ? undefined : settings.schemaEntity}
            options={PERSON_OPTIONS}
            emptyLabel="An organization"
            onChange={(value) =>
              setMeta('schemaEntity', pickOption(SITE_ENTITY_TYPES, value), 'discrete')
            }
          />
          <MetaTextInput
            id="ve-project-entity-name"
            label={settings.schemaEntity === 'Person' ? 'Full name' : 'Organization name'}
            value={settings.entityName}
            placeholder={settings.title}
            validate={validateMeta('entityName')}
            onCommit={commitText('entityName')}
          />
          <MetaTextInput
            id="ve-project-profiles"
            label="Social profiles, one address per line"
            value={settings.socialProfiles}
            placeholder="https://www.linkedin.com/company/acme"
            rows={TEXTAREA_ROWS}
            validate={validateMeta('socialProfiles')}
            onCommit={commitText('socialProfiles')}
          />
          <MetaTextInput
            id="ve-project-email"
            label="Contact email"
            value={settings.contactEmail}
            validate={validateMeta('contactEmail')}
            onCommit={commitText('contactEmail')}
          />
          <MetaTextInput
            id="ve-project-phone"
            label="Contact phone"
            value={settings.contactPhone}
            validate={validateMeta('contactPhone')}
            onCommit={commitText('contactPhone')}
          />
        </>
      )}
      <MetaTextInput
        id="ve-project-json-ld"
        label="Extra JSON-LD for every page"
        value={settings.jsonLd}
        placeholder='{ "@context": "https://schema.org", "@type": "Event" }'
        rows={CODE_ROWS}
        validate={validateMeta('jsonLd')}
        onCommit={commitText('jsonLd')}
      />
    </MetaSection>
  );
}

export function ProjectSettingsPanel(): JSX.Element {
  const settings = useStore((state) => state.project.settings);

  return (
    <div className="ve-project-settings">
      <SiteSection settings={settings} />
      <SearchSection settings={settings} />
      <SharingSection settings={settings} />
      <IconsSection settings={settings} />
      <VerificationSection settings={settings} />
      <CrawlersSection settings={settings} />
      <StructuredDataSection settings={settings} />
      <MetaSection id="settings:meta-tags" title="Custom meta tags">
        <MetaTagsInput
          id="ve-project-meta-tags"
          label="Meta tags on every page"
          value={settings.metaTags}
          onChange={(tags, kind) => setMeta('metaTags', tags, kind)}
        />
      </MetaSection>
    </div>
  );
}
