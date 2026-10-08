import type { JSX, ReactNode } from 'react';
import {
  pageMetaSet,
  pageNoindexSet,
  pageSeoSet,
  pageSharedSlotShown,
  pageSlugSet,
  pageSocialImageSet,
  SOCIAL_IMAGE_TYPES,
  type EditKind,
  type SeoTextKey,
} from '../../app/projectSlice';
import { pageMetaError, type PageMetaKey } from '../../app/settingsRules';
import { slugError } from '../../app/slugs';
import { dispatch, selectCurrentPage, useStore } from '../../app/store';
import {
  IMAGE_PREVIEW_SIZES,
  OPEN_GRAPH_TYPES,
  PAGE_SCHEMA_TYPES,
  SITEMAP_FREQUENCIES,
  type Page,
  type PageMeta,
  type ProjectSettings,
  type SharedSlot,
} from '../../app/types';
import type { Field as FieldSchema } from '../../components/types';
import { absoluteUrl, pageSeoDefaults } from '../../render/pageHead';
import {
  booleanOf,
  FREQUENCY_OPTIONS,
  IMAGE_PREVIEW_OPTIONS,
  labelOf,
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
  YES_NO_OPTIONS,
  yesNoValue,
  type ChoiceOption,
} from '../project/MetaControls';
import { pageFileName } from '../pages/PagesTab';
import { FieldControl } from './FieldControl';
import { ImageUploadInput } from './ImageUploadInput';
import { useSection } from '../editor/useSection';
import { BackToCanvasButton } from '../editor/CompactTabs';
import { DraftInput, Field, Section, Switch, Title } from '../../../packages/ui/src';

export const SOCIAL_IMAGE_TYPE_ERROR = 'Use a PNG, JPEG, WebP or GIF image';

const CODE_ROWS = 6;

const PAGE_TYPE_OPTIONS: ChoiceOption[] = [
  { value: 'AboutPage', label: 'About page' },
  { value: 'ContactPage', label: 'Contact page' },
  { value: 'CollectionPage', label: 'Collection or list' },
  { value: 'FAQPage', label: 'Questions and answers' },
  { value: 'ProfilePage', label: 'Profile' },
];

const SEO_FIELDS: Record<SeoTextKey, FieldSchema> = {
  title: { name: 'title', label: 'Page title', type: 'text', default: '' },
  description: { name: 'description', label: 'Meta description', type: 'textarea', default: '' },
  socialTitle: { name: 'socialTitle', label: 'Social title', type: 'text', default: '' },
  socialDescription: {
    name: 'socialDescription',
    label: 'Social description',
    type: 'textarea',
    default: '',
  },
};

function PageSection({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}): JSX.Element {
  const section = useSection(`page:${id}`);
  return (
    <Section title={title} isOpen={section.isOpen} onToggle={section.onToggle}>
      {children}
    </Section>
  );
}

function SocialImageInput({ page }: { page: Page }): JSX.Element {
  const assetId = page.seo.socialImageAssetId;
  const asset = useStore((state) =>
    assetId === undefined ? undefined : state.project.assets[assetId],
  );
  return (
    <ImageUploadInput
      id="ve-social-image"
      label="Social image"
      asset={asset}
      accept={SOCIAL_IMAGE_TYPES}
      typeError={SOCIAL_IMAGE_TYPE_ERROR}
      shape="social"
      onChange={(upload) => dispatch(pageSocialImageSet(page.id, upload))}
    />
  );
}

function SlugControl({ page }: { page: Page }): JSX.Element {
  const pages = useStore((state) => state.project.pages);
  const otherSlugs: string[] = [];
  for (const id of pages.ids) {
    const other = pages.entities[id];
    if (other !== undefined && id !== page.id) otherSlugs.push(other.slug);
  }

  return (
    <div data-field-path="page.slug">
      <Field id="ve-page-settings-slug" label="Slug">
        <DraftInput
          id="ve-page-settings-slug"
          value={page.slug}
          validate={(text) => slugError(text, otherSlugs)}
          onCommit={(text) => dispatch(pageSlugSet(page.id, text, 'continuous'))}
        />
      </Field>
    </div>
  );
}

function SharedSlotSwitch({ page, slot }: { page: Page; slot: SharedSlot }): JSX.Element | null {
  const slotBlockCount = useStore((state) => state.project.sharedSlots[slot].length);
  if (slotBlockCount === 0) return null;
  const isShown = slot === 'header' ? page.showSharedHeader : page.showSharedFooter;
  return (
    <Switch
      id={`ve-page-shared-${slot}`}
      label={`Show shared ${slot}`}
      checked={isShown}
      onChange={(event) =>
        dispatch(pageSharedSlotShown({ pageId: page.id, slot, isShown: event.target.checked }))
      }
    />
  );
}

function setPageMeta<Key extends PageMetaKey>(
  page: Page,
  key: Key,
  value: PageMeta[Key],
  kind: EditKind,
): void {
  dispatch(pageMetaSet(page.id, key, value, kind));
}

function siteDefaultLabel(text: string): string {
  return `Site default (${text})`;
}

function yesNoDefault(value: boolean | undefined): string {
  return siteDefaultLabel(value === false ? 'No' : 'Yes');
}

type OverrideProps = { page: Page; settings: ProjectSettings };

type CrawlerOverridesProps = OverrideProps & { fileName: string };

function CrawlerOverrides({ page, settings, fileName }: CrawlerOverridesProps): JSX.Element {
  const toggles: { key: 'follow' | 'snippets' | 'translate'; label: string }[] = [
    { key: 'follow', label: 'Follow links' },
    { key: 'snippets', label: 'Show text snippets' },
    { key: 'translate', label: 'Offer translations' },
  ];
  const canonicalPlaceholder = absoluteUrl(settings.baseUrl, fileName) ?? '';
  return (
    <>
      <MetaTextInput
        id="ve-page-canonical"
        label="Canonical URL"
        value={page.seo.canonicalUrl}
        placeholder={canonicalPlaceholder}
        validate={(text) => pageMetaError('canonicalUrl', text)}
        onCommit={(text) => setPageMeta(page, 'canonicalUrl', text, 'continuous')}
      />
      {toggles.map(({ key, label }) => (
        <MetaSelect
          key={key}
          id={`ve-page-${key}`}
          label={label}
          value={yesNoValue(page.seo[key])}
          options={YES_NO_OPTIONS}
          emptyLabel={yesNoDefault(settings[key])}
          onChange={(value) => setPageMeta(page, key, booleanOf(value), 'discrete')}
        />
      ))}
      <MetaSelect
        id="ve-page-image-preview"
        label="Image previews in results"
        value={page.seo.imagePreview}
        options={IMAGE_PREVIEW_OPTIONS}
        emptyLabel={siteDefaultLabel(
          labelOf(IMAGE_PREVIEW_OPTIONS, settings.imagePreview) || 'Search engine default',
        )}
        onChange={(value) =>
          setPageMeta(page, 'imagePreview', pickOption(IMAGE_PREVIEW_SIZES, value), 'discrete')
        }
      />
      <MetaTextInput
        id="ve-page-keywords"
        label="Keywords"
        value={page.seo.keywords}
        placeholder={settings.keywords}
        validate={(text) => pageMetaError('keywords', text)}
        onCommit={(text) => setPageMeta(page, 'keywords', text, 'continuous')}
      />
      <MetaTextInput
        id="ve-page-author"
        label="Author"
        value={page.seo.author}
        placeholder={settings.author}
        validate={(text) => pageMetaError('author', text)}
        onCommit={(text) => setPageMeta(page, 'author', text, 'continuous')}
      />
    </>
  );
}

function SharingOverrides({ page, settings }: OverrideProps): JSX.Element {
  return (
    <>
      <MetaTextInput
        id="ve-page-social-image-alt"
        label="Social image alt text"
        value={page.seo.socialImageAlt}
        placeholder={settings.socialImageAlt}
        validate={(text) => pageMetaError('socialImageAlt', text)}
        onCommit={(text) => setPageMeta(page, 'socialImageAlt', text, 'continuous')}
      />
      <MetaSelect
        id="ve-page-og-type"
        label="Content type"
        value={page.seo.openGraphType}
        options={OPEN_GRAPH_OPTIONS}
        emptyLabel={siteDefaultLabel(
          labelOf(OPEN_GRAPH_OPTIONS, settings.openGraphType ?? 'website'),
        )}
        onChange={(value) =>
          setPageMeta(page, 'openGraphType', pickOption(OPEN_GRAPH_TYPES, value), 'discrete')
        }
      />
      <MetaTextInput
        id="ve-page-twitter-creator"
        label="X account of the author"
        value={page.seo.twitterCreator}
        placeholder={settings.twitterCreator ?? '@jane'}
        validate={(text) => pageMetaError('twitterCreator', text)}
        onCommit={(text) => setPageMeta(page, 'twitterCreator', text, 'continuous')}
      />
    </>
  );
}

function SitemapOverrides({ page, settings }: OverrideProps): JSX.Element {
  return (
    <>
      <Switch
        id="ve-page-sitemap-excluded"
        label="Leave out of the sitemap"
        checked={page.seo.sitemapExcluded === true}
        onChange={(event) =>
          setPageMeta(page, 'sitemapExcluded', event.target.checked ? true : undefined, 'discrete')
        }
      />
      <MetaSelect
        id="ve-page-frequency"
        label="How often this page changes"
        value={page.seo.sitemapFrequency}
        options={FREQUENCY_OPTIONS}
        emptyLabel={siteDefaultLabel(
          labelOf(FREQUENCY_OPTIONS, settings.sitemapFrequency) || 'Not set',
        )}
        onChange={(value) =>
          setPageMeta(page, 'sitemapFrequency', pickOption(SITEMAP_FREQUENCIES, value), 'discrete')
        }
      />
      <MetaSelect
        id="ve-page-priority"
        label="Page priority"
        value={priorityText(page.seo.sitemapPriority)}
        options={PRIORITY_OPTIONS}
        emptyLabel={siteDefaultLabel(priorityText(settings.sitemapPriority) ?? 'Not set')}
        onChange={(value) => setPageMeta(page, 'sitemapPriority', priorityValue(value), 'discrete')}
      />
    </>
  );
}

function StructuredDataOverrides({ page }: { page: Page }): JSX.Element {
  return (
    <>
      <MetaSelect
        id="ve-page-schema-type"
        label="Kind of page"
        value={page.seo.schemaType === 'WebPage' ? undefined : page.seo.schemaType}
        options={PAGE_TYPE_OPTIONS}
        emptyLabel="Web page"
        onChange={(value) =>
          setPageMeta(page, 'schemaType', pickOption(PAGE_SCHEMA_TYPES, value), 'discrete')
        }
      />
      <MetaTextInput
        id="ve-page-json-ld"
        label="Extra JSON-LD for this page"
        value={page.seo.jsonLd}
        placeholder='{ "@context": "https://schema.org", "@type": "Event" }'
        rows={CODE_ROWS}
        validate={(text) => pageMetaError('jsonLd', text)}
        onCommit={(text) => setPageMeta(page, 'jsonLd', text, 'continuous')}
      />
    </>
  );
}

export function PageSettingsPanel(): JSX.Element {
  const page = useStore(selectCurrentPage);
  const homePageId = useStore((state) => state.project.pages.homePageId);
  const settings = useStore((state) => state.project.settings);
  const defaults = pageSeoDefaults({ settings }, page);
  const placeholders: Record<SeoTextKey, string> = {
    title: page.name,
    description: settings.description.trim(),
    socialTitle: defaults.socialTitle,
    socialDescription: defaults.socialDescription,
  };
  const hasSharedBlocks = useStore(
    (state) =>
      state.project.sharedSlots.header.length + state.project.sharedSlots.footer.length > 0,
  );

  function renderSeoField(key: SeoTextKey): JSX.Element {
    return (
      <FieldControl
        key={key}
        field={{ ...SEO_FIELDS[key], placeholder: placeholders[key] }}
        value={page.seo[key] ?? ''}
        path={`page-${key}`}
        onChange={(value, kind) => {
          if (typeof value === 'string') dispatch(pageSeoSet(page.id, key, value, kind));
        }}
      />
    );
  }

  return (
    <div className="ve-page-settings" key={page.id}>
      <header className="ve-panel-header">
        <div className="ve-panel-heading">
          <Title>Page settings</Title>
          <span className="ve-panel-detail">
            {page.name} · {pageFileName(page, homePageId)}
          </span>
          <BackToCanvasButton />
        </div>
      </header>
      <PageSection id="seo" title="Search engines">
        {renderSeoField('title')}
        <SlugControl page={page} />
        {renderSeoField('description')}
        <Switch
          id="ve-page-noindex"
          label="Hide from search engines"
          checked={page.seo.noindex}
          onChange={(event) =>
            dispatch(pageNoindexSet({ pageId: page.id, noindex: event.target.checked }))
          }
        />
        <CrawlerOverrides
          page={page}
          settings={settings}
          fileName={pageFileName(page, homePageId)}
        />
      </PageSection>
      <PageSection id="social" title="Social sharing">
        {renderSeoField('socialTitle')}
        {renderSeoField('socialDescription')}
        <SocialImageInput page={page} />
        <SharingOverrides page={page} settings={settings} />
      </PageSection>
      <MetaSection id="page:color" title="Colors">
        <ThemeColorInput
          id="ve-page-theme-color"
          label="Browser theme color"
          value={page.seo.themeColor}
          inheritedValue={settings.themeColor}
          emptyLabel={settings.themeColor === undefined ? 'Not set' : 'Site default'}
          resetLabel="Use the site default"
          onChange={(value, kind) => setPageMeta(page, 'themeColor', value, kind)}
        />
      </MetaSection>
      <MetaSection id="page:sitemap" title="Sitemap">
        <SitemapOverrides page={page} settings={settings} />
      </MetaSection>
      <MetaSection id="page:schema" title="Structured data">
        <StructuredDataOverrides page={page} />
      </MetaSection>
      <MetaSection id="page:meta-tags" title="Custom meta tags">
        <MetaTagsInput
          id="ve-page-meta-tags"
          label="Meta tags on this page"
          value={page.seo.metaTags}
          onChange={(tags, kind) => setPageMeta(page, 'metaTags', tags, kind)}
        />
      </MetaSection>
      {hasSharedBlocks && (
        <PageSection id="shared" title="Shared header and footer">
          <SharedSlotSwitch page={page} slot="header" />
          <SharedSlotSwitch page={page} slot="footer" />
        </PageSection>
      )}
    </div>
  );
}
