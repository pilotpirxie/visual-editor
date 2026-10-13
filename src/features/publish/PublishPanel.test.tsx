import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { APP_SETTINGS_STORAGE_KEY, readAppSettings } from '../../app/appSettings';
import { store } from '../../app/store';
import { changeValue, click, getButton, render } from '../../test/dom';
import { PublishError, publishToNetlify } from './netlify';
import { PublishPanel } from './PublishPanel';

vi.mock('./netlify', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./netlify')>()),
  publishToNetlify: vi.fn(),
}));

const ZIP = new Blob(['zip']);
const publish = vi.mocked(publishToNetlify);

beforeEach(() => {
  localStorage.removeItem(APP_SETTINGS_STORAGE_KEY);
});

afterEach(() => {
  publish.mockReset();
});

describe('PublishPanel', () => {
  it('needs a token before it can publish', () => {
    const { container } = render(<PublishPanel zip={ZIP} />);
    expect(getButton(container, 'Publish to Netlify').disabled).toBe(true);
    changeValue(container.querySelector('input[type="password"]'), 'token-1');
    expect(readAppSettings().netlifyToken).toBe('token-1');
    expect(getButton(container, 'Publish to Netlify').disabled).toBe(false);
    click(getButton(container, 'Remove'));
    expect(readAppSettings().netlifyToken).toBe('');
  });

  it('publishes, shows the address and publishes changes to the same site next time', async () => {
    publish.mockResolvedValue({ siteId: 'site-1', url: 'https://one.netlify.app' });
    const { container } = render(<PublishPanel zip={ZIP} />);
    changeValue(container.querySelector('input[type="password"]'), ' token-1 ');
    click(getButton(container, 'Publish to Netlify'));
    await vi.waitFor(() =>
      expect(container.querySelector('a')?.getAttribute('href')).toBe('https://one.netlify.app'),
    );
    expect(publish).toHaveBeenCalledWith(ZIP, 'token-1', null);
    const projectId = store.getState().project.id;
    expect(readAppSettings().publishedSites[projectId]?.siteId).toBe('site-1');
    click(getButton(container, 'Publish changes'));
    await vi.waitFor(() => expect(publish).toHaveBeenLastCalledWith(ZIP, 'token-1', 'site-1'));
  });

  it('explains a failure and forgets a site that was deleted on Netlify', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    publish.mockResolvedValueOnce({ siteId: 'site-1', url: 'https://one.netlify.app' });
    const { container } = render(<PublishPanel zip={ZIP} />);
    changeValue(container.querySelector('input[type="password"]'), 'token-1');
    click(getButton(container, 'Publish to Netlify'));
    await vi.waitFor(() => expect(getButton(container, 'Publish changes')).toBeDefined());
    publish.mockRejectedValueOnce(
      new PublishError('missing-site', 'The site no longer exists on Netlify.'),
    );
    click(getButton(container, 'Publish changes'));
    await vi.waitFor(() =>
      expect(container.querySelector('[role="alert"]')?.textContent).toBe(
        'The site no longer exists on Netlify. Publish again to make a new site.',
      ),
    );
    expect(readAppSettings().publishedSites).toEqual({});
    expect(getButton(container, 'Publish to Netlify')).toBeDefined();
    error.mockRestore();
  });
});
