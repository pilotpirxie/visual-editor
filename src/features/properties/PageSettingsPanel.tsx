import { useRef, useState, type ChangeEvent, type JSX } from 'react';
import {
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
import type { Field } from '../../components/types';
import { Icon } from '../editor/Icon';
import { pageFileName } from '../pages/PagesTab';
import { DraftInput } from './DraftInput';
import { FieldControl } from './FieldControl';

const MAX_SOCIAL_IMAGE_BYTES = 1024 * 1024;
const SOCIAL_IMAGE_TYPE_ERROR = 'Use a PNG, JPEG, WebP or GIF image';
const SOCIAL_IMAGE_SIZE_ERROR = 'Use an image smaller than 1 MB';

function seoFields(page: Page, fullTitle: string): Record<SeoTextKey, Field> {
  const hasDescription = (page.seo.description?.trim() ?? '') !== '';
  return {
    title: {
      name: 'title',
      label: 'Page title',
      type: 'text',
      default: '',
      help: `Shown in browser tabs and search results. Leave empty to use “${page.name}”.`,
    },
    description: {
      name: 'description',
      label: 'Meta description',
      type: 'textarea',
      default: '',
      help: 'One or two sentences shown under the title in search results.',
    },
    socialTitle: {
      name: 'socialTitle',
      label: 'Social title',
      type: 'text',
      default: '',
      help: `Shown when the page is shared. Leave empty to use “${fullTitle}”.`,
    },
    socialDescription: {
      name: 'socialDescription',
      label: 'Social description',
      type: 'textarea',
      default: '',
      help: hasDescription
        ? 'Shown when the page is shared. Leave empty to use the meta description.'
        : 'Shown when the page is shared.',
    },
  };
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
        return;
      }
      reject(new Error('The image could not be read as a data URL'));
    };
    reader.onerror = () => reject(reader.error ?? new Error('The image could not be read'));
    reader.readAsDataURL(file);
  });
}

function SocialImageInput({ page }: { page: Page }): JSX.Element {
  const assetId = page.seo.socialImageAssetId;
  const asset = useStore((state) =>
    assetId === undefined ? undefined : state.project.assets[assetId],
  );
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function upload(event: ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file === undefined) return;
    if (!SOCIAL_IMAGE_TYPES.includes(file.type)) {
      setError(SOCIAL_IMAGE_TYPE_ERROR);
      return;
    }
    if (file.size > MAX_SOCIAL_IMAGE_BYTES) {
      setError(SOCIAL_IMAGE_SIZE_ERROR);
      return;
    }
    try {
      const dataUrl = await readAsDataUrl(file);
      setError(null);
      dispatch(pageSocialImageSet(page.id, { name: file.name, mimeType: file.type, dataUrl }));
    } catch (readError) {
      console.error(`Could not read the social image ${file.name}`, readError);
      setError('The image could not be read. Try another file.');
    }
  }

  return (
    <div className="ve-control" data-field-path="page.socialImage">
      <span className="ve-control-label" id="ve-social-image-label">
        Social image
      </span>
      {asset !== undefined && (
        <img className="ve-social-preview" src={asset.dataUrl} alt="" width={240} height={126} />
      )}
      <div className="ve-social-actions">
        <button
          type="button"
          className="ve-button ve-button--outline"
          aria-describedby="ve-social-image-label"
          onClick={() => inputRef.current?.click()}
        >
          <Icon name="image" />
          {asset === undefined ? 'Upload image' : 'Replace image'}
        </button>
        {asset !== undefined && (
          <button
            type="button"
            className="ve-button"
            onClick={() => dispatch(pageSocialImageSet(page.id, null))}
          >
            Remove
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        className="ve-visually-hidden"
        type="file"
        accept={SOCIAL_IMAGE_TYPES.join(',')}
        tabIndex={-1}
        aria-hidden="true"
        onChange={(event) => void upload(event)}
      />
      <p className="ve-control-help">A 1200 × 630 px image works best.</p>
      {error !== null && (
        <p className="ve-control-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

function SlugControl({ page, isHome }: { page: Page; isHome: boolean }): JSX.Element {
  const pages = useStore((state) => state.project.pages);
  const otherSlugs: string[] = [];
  for (const id of pages.ids) {
    const other = pages.entities[id];
    if (other !== undefined && id !== page.id) otherSlugs.push(other.slug);
  }

  return (
    <div className="ve-control" data-field-path="page.slug">
      <label className="ve-control-label" htmlFor="ve-page-settings-slug">
        Slug
      </label>
      <DraftInput
        id="ve-page-settings-slug"
        label="Slug"
        value={page.slug}
        validate={(text) => slugError(text, otherSlugs)}
        onCommit={(text) => dispatch(pageSlugSet(page.id, text, 'continuous'))}
      />
      <p className="ve-control-help">
        {isHome
          ? 'Exported as index.html while this is the home page.'
          : `Exported as ${page.slug}.html. Links to this page update by themselves.`}
      </p>
    </div>
  );
}

function SharedSlotSwitch({ page, slot }: { page: Page; slot: SharedSlot }): JSX.Element | null {
  const slotBlockCount = useStore((state) => state.project.sharedSlots[slot].length);
  if (slotBlockCount === 0) return null;
  const isShown = slot === 'header' ? page.showSharedHeader : page.showSharedFooter;
  const id = `ve-page-shared-${slot}`;

  return (
    <div className="ve-control">
      <label className="ve-switch" htmlFor={id}>
        <input
          id={id}
          type="checkbox"
          role="switch"
          checked={isShown}
          onChange={(event) =>
            dispatch(
              pageSharedSlotShown({ pageId: page.id, slot, isShown: event.target.checked }),
            )
          }
        />
        <span className="ve-control-label">Show shared {slot}</span>
      </label>
    </div>
  );
}

export function PageSettingsPanel(): JSX.Element {
  const page = useStore(selectCurrentPage);
  const homePageId = useStore((state) => state.project.pages.homePageId);
  const siteTitle = useStore((state) => state.project.settings.title);
  const hasSharedBlocks = useStore(
    (state) => state.project.sharedSlots.header.length + state.project.sharedSlots.footer.length > 0,
  );
  const isHome = page.id === homePageId;
  const fullTitle = `${page.seo.title?.trim() || page.name} | ${siteTitle}`;
  const fields = seoFields(page, fullTitle);

  function renderSeoField(key: SeoTextKey): JSX.Element {
    return (
      <FieldControl
        key={key}
        field={fields[key]}
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
      <header className="ve-properties-section">
        <h2 className="ve-properties-title">Page settings</h2>
        <p className="ve-muted">
          {page.name} · {pageFileName(page, homePageId)}
        </p>
      </header>
      <section className="ve-properties-section">
        <h3 className="ve-group-title">Search engines</h3>
        {renderSeoField('title')}
        <SlugControl page={page} isHome={isHome} />
        {renderSeoField('description')}
      </section>
      <section className="ve-properties-section">
        <h3 className="ve-group-title">Social sharing</h3>
        {renderSeoField('socialTitle')}
        {renderSeoField('socialDescription')}
        <SocialImageInput page={page} />
      </section>
      {hasSharedBlocks && (
        <section className="ve-properties-section">
          <h3 className="ve-group-title">Shared blocks</h3>
          <SharedSlotSwitch page={page} slot="header" />
          <SharedSlotSwitch page={page} slot="footer" />
        </section>
      )}
    </div>
  );
}
