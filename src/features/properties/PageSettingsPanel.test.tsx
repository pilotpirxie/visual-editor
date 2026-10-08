import { beforeEach, describe, expect, it, vi } from 'vitest';
import { pageAdded, siteMetaSet } from '../../app/projectSlice';
import { dispatch, selectCurrentPage, store } from '../../app/store';
import { blur, changeValue, click, getButton, render, runInAct } from '../../test/dom';
import { loadIntoAppStore, shareNavAndFooter } from '../../test/fixtures';
import { PageSettingsPanel } from './PageSettingsPanel';

vi.mock('../../persistence/db', () => ({
  putProject: vi.fn(async () => {}),
  getProject: vi.fn(async () => null),
  listProjects: vi.fn(async () => []),
  deleteProject: vi.fn(async () => {}),
}));

function seo() {
  return selectCurrentPage(store.getState()).seo;
}

function fieldInput(container: HTMLElement, path: string): Element | null {
  return container.querySelector(`[data-field-path="${path}"] :is(input, textarea)`);
}

function chooseFile(container: HTMLElement, file: File): void {
  const input = container.querySelector('input[type="file"]');
  if (!(input instanceof HTMLInputElement)) throw new Error('No file input');
  Object.defineProperty(input, 'files', { value: [file], configurable: true });
  runInAct(() => input.dispatchEvent(new Event('change', { bubbles: true })));
}

beforeEach(() => {
  loadIntoAppStore();
});

describe('PageSettingsPanel', () => {
  it('names the page and the file it is exported as', () => {
    const { container } = render(<PageSettingsPanel />);
    expect(container.querySelector('header .ve-panel-detail')?.textContent).toBe(
      'Home · index.html',
    );
  });

  it('saves the SEO and social texts, and clearing one brings back its default', () => {
    const { container } = render(<PageSettingsPanel />);
    changeValue(fieldInput(container, 'page-title'), 'Customer research');
    changeValue(fieldInput(container, 'page-description'), 'Interviews, tagged.');
    changeValue(fieldInput(container, 'page-socialTitle'), 'Fieldnote');
    expect(seo()).toEqual({
      noindex: false,
      title: 'Customer research',
      description: 'Interviews, tagged.',
      socialTitle: 'Fieldnote',
    });
    changeValue(fieldInput(container, 'page-title'), '');
    expect(seo().title).toBeUndefined();
  });

  it('edits the slug and keeps a taken slug as a draft with a message', () => {
    runInAct(() => dispatch(pageAdded({ id: 'about', name: 'About', slug: 'about' })));
    const { container } = render(<PageSettingsPanel />);
    const slug = container.querySelector('#ve-page-settings-slug');
    changeValue(slug, 'start');
    expect(selectCurrentPage(store.getState()).slug).toBe('start');
    changeValue(slug, 'about');
    blur(slug);
    expect(selectCurrentPage(store.getState()).slug).toBe('start');
    expect(container.querySelector('[role="alert"]')?.textContent).toBe(
      'Another page already uses this slug',
    );
    blur(slug);
  });

  it('uploads a social image, previews it and removes it', async () => {
    const { container } = render(<PageSettingsPanel />);
    chooseFile(container, new File(['png'], 'card.png', { type: 'image/png' }));
    await vi.waitFor(() => expect(container.querySelector('.ve-upload-preview')).not.toBeNull());
    const assetId = seo().socialImageAssetId ?? '';
    expect(store.getState().project.assets[assetId]?.dataUrl).toMatch(/^data:image\/png;base64,/);
    click(getButton(container, 'Remove'));
    expect(seo().socialImageAssetId).toBeUndefined();
  });

  it.each([
    [
      'a file that is not a supported image',
      new File(['x'], 'a.svg', { type: 'image/svg+xml' }),
      'Use a PNG, JPEG, WebP or GIF image',
    ],
    [
      'an image over 1 MB',
      new File([new Uint8Array(1024 * 1024 + 1)], 'big.png', { type: 'image/png' }),
      'Use an image smaller than 1 MB',
    ],
  ])('explains why it refuses %s', (_name, file, message) => {
    const { container } = render(<PageSettingsPanel />);
    chooseFile(container, file);
    expect(container.querySelector('[role="alert"]')?.textContent).toBe(message);
    expect(seo().socialImageAssetId).toBeUndefined();
  });

  it('shows the shared slot switches only once the project has shared blocks', () => {
    const { container } = render(<PageSettingsPanel />);
    expect(container.querySelector('#ve-page-shared-header')).toBeNull();
    runInAct(() => {
      shareNavAndFooter();
    });
    expect(container.querySelector('#ve-page-shared-header')).not.toBeNull();
    expect(container.querySelector('#ve-page-shared-footer')).not.toBeNull();
  });

  it('hides and shows the shared footer on this page', () => {
    shareNavAndFooter();
    const { container } = render(<PageSettingsPanel />);
    click(container.querySelector('#ve-page-shared-footer'));
    expect(selectCurrentPage(store.getState()).showSharedFooter).toBe(false);
    expect(selectCurrentPage(store.getState()).showSharedHeader).toBe(true);
    click(container.querySelector('#ve-page-shared-footer'));
    expect(selectCurrentPage(store.getState()).showSharedFooter).toBe(true);
  });

  it('shows the site defaults in the override choices and stores only real overrides', () => {
    runInAct(() => {
      dispatch(siteMetaSet('follow', false, 'discrete'));
      dispatch(siteMetaSet('imagePreview', 'large', 'discrete'));
    });
    const { container } = render(<PageSettingsPanel />);
    const follow = container.querySelector<HTMLSelectElement>('#ve-page-follow');
    expect(follow?.options[0]?.textContent).toBe('Site default (No)');
    const preview = container.querySelector<HTMLSelectElement>('#ve-page-image-preview');
    expect(preview?.options[0]?.textContent).toBe('Site default (Large)');
    changeValue(follow, 'yes');
    expect(seo().follow).toBe(true);
    changeValue(follow, '');
    expect(seo()).not.toHaveProperty('follow');
  });

  it('offers the site keywords as the placeholder and stores page keywords', () => {
    runInAct(() => dispatch(siteMetaSet('keywords', 'research', 'discrete')));
    const { container } = render(<PageSettingsPanel />);
    const keywords = container.querySelector<HTMLInputElement>('#ve-page-keywords');
    expect(keywords?.placeholder).toBe('research');
    changeValue(keywords, 'pricing, plans');
    expect(seo().keywords).toBe('pricing, plans');
  });

  it('accepts only a full canonical address', () => {
    const { container } = render(<PageSettingsPanel />);
    const canonical = container.querySelector('#ve-page-canonical');
    changeValue(canonical, 'other.example/page');
    expect(seo().canonicalUrl).toBeUndefined();
    changeValue(canonical, 'https://other.example/page');
    expect(seo().canonicalUrl).toBe('https://other.example/page');
  });

  it('sets a page theme color from the site default and resets it', () => {
    runInAct(() => dispatch(siteMetaSet('themeColor', '#112233', 'discrete')));
    const { container } = render(<PageSettingsPanel />);
    click(getButton(container, 'Choose color'));
    expect(seo().themeColor).toBe('#112233');
    click(getButton(container, 'Use the site default'));
    expect(seo()).not.toHaveProperty('themeColor');
  });

  it('leaves the page out of the sitemap and stores its priority', () => {
    const { container } = render(<PageSettingsPanel />);
    click(container.querySelector('#ve-page-sitemap-excluded'));
    expect(seo().sitemapExcluded).toBe(true);
    const priority = container.querySelector<HTMLSelectElement>('#ve-page-priority');
    expect(priority?.options[0]?.textContent).toBe('Site default (Not set)');
    changeValue(priority, '0.8');
    expect(seo().sitemapPriority).toBe(0.8);
    changeValue(priority, '');
    expect(seo()).not.toHaveProperty('sitemapPriority');
  });

  it('marks the kind of page for structured data', () => {
    const { container } = render(<PageSettingsPanel />);
    changeValue(container.querySelector('#ve-page-schema-type'), 'ContactPage');
    expect(seo().schemaType).toBe('ContactPage');
  });
});
