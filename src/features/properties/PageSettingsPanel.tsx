import type { JSX, ReactNode } from 'react';
import {
  pageNoindexSet,
  pageSeoSet,
  pageSharedSlotShown,
  pageSlugSet,
  pageSocialImageSet,
  SOCIAL_IMAGE_TYPES,
  type SeoTextKey,
} from '../../app/projectSlice';
import { slugError } from '../../app/slugs';
import { dispatch, selectCurrentPage, useStore } from '../../app/store';
import type { Page, SharedSlot } from '../../app/types';
import type { Field as FieldSchema } from '../../components/types';
import { pageFileName } from '../pages/PagesTab';
import { FieldControl } from './FieldControl';
import { ImageUploadInput } from './ImageUploadInput';
import { useSection } from '../editor/useSection';
import { DraftInput, Field, Section, Switch, Title } from '../../../packages/ui/src';

export const SOCIAL_IMAGE_TYPE_ERROR = 'Use a PNG, JPEG, WebP or GIF image';

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

export function PageSettingsPanel(): JSX.Element {
  const page = useStore(selectCurrentPage);
  const homePageId = useStore((state) => state.project.pages.homePageId);
  const hasSharedBlocks = useStore(
    (state) =>
      state.project.sharedSlots.header.length + state.project.sharedSlots.footer.length > 0,
  );

  function renderSeoField(key: SeoTextKey): JSX.Element {
    return (
      <FieldControl
        key={key}
        field={SEO_FIELDS[key]}
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
      <header className="ve-properties-header">
        <Title>Page settings</Title>
        <p className="ui-muted">
          {page.name} · {pageFileName(page, homePageId)}
        </p>
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
      </PageSection>
      <PageSection id="social" title="Social sharing">
        {renderSeoField('socialTitle')}
        {renderSeoField('socialDescription')}
        <SocialImageInput page={page} />
      </PageSection>
      {hasSharedBlocks && (
        <PageSection id="shared" title="Shared header and footer">
          <SharedSlotSwitch page={page} slot="header" />
          <SharedSlotSwitch page={page} slot="footer" />
        </PageSection>
      )}
    </div>
  );
}
