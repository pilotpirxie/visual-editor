import { expect, test } from '@playwright/test';
import {
  closeLibraryDrawer,
  createProject,
  exportedFiles,
  insertBlock,
  openProjectSettings,
  storedProject,
} from './editor';

test('one form service reaches every form, statistics ship in the export and the checklist follows', async ({
  page,
}) => {
  await createProject(page);
  await insertBlock(page, 'Contacts', 'Contact, form and details');
  const form = page.frameLocator('.ve-canvas-frame').locator('.b-contact-form form');
  await expect(form).toHaveAttribute('method', 'dialog');

  const settings = await openProjectSettings(page);
  await settings.getByText('Forms', { exact: true }).click();
  await settings.getByLabel('Where forms send messages').selectOption('Formspree');
  const address = settings.getByLabel('Form address from Formspree');
  await address.fill('https://formspree.io/f/abcdwxyz');
  await address.blur();
  await expect(form).toHaveAttribute('action', 'https://formspree.io/f/abcdwxyz');
  await expect(form).toHaveAttribute('method', 'post');

  await settings.getByText('Visitor statistics', { exact: true }).click();
  await settings.getByLabel('Statistics service').selectOption('Plausible');
  const site = settings.getByLabel('Site address in Plausible');
  await site.fill('example.com');
  await site.blur();
  await closeLibraryDrawer(page);

  const files = await exportedFiles(page);
  const html = files.get('index.html')?.toString('utf8') ?? '';
  expect(html).toContain(
    '<body data-behavior="analytics" data-analytics-service="plausible" data-analytics-id="example.com">',
  );
  expect(html).toContain('action="https://formspree.io/f/abcdwxyz" method="post"');
  expect(files.get('assets/js/site.js')?.toString('utf8')).toContain('plausible.io/js/script.js');
  await page.getByRole('dialog', { name: 'Site exported' }).getByRole('button').click();

  await page.getByRole('button', { name: /^File/ }).click();
  await page.getByRole('menuitem', { name: 'Launch checklist…' }).click();
  const checklist = page.getByRole('dialog', { name: 'Launch checklist' });
  await expect(checklist.getByRole('status')).toHaveText(/^\d+ of 10 done$/);
  const forms = checklist.locator('.ve-launch-item', { hasText: 'Forms send messages somewhere' });
  await expect(forms).toHaveAttribute('data-done', 'true');
  const favicon = checklist.locator('.ve-launch-item', { hasText: 'The site has a favicon' });
  await favicon.getByRole('button', { name: 'Fix' }).click();
  await expect(checklist).toBeHidden();
  await expect(page.locator('.ve-project-settings')).toBeVisible();
});

test('a video block plays a YouTube link in place in Preview and stays a link while editing', async ({
  page,
}) => {
  await page.route('https://www.youtube-nocookie.com/**', (route) =>
    route.fulfill({ contentType: 'text/html', body: '<title>player</title>' }),
  );
  await createProject(page);
  await insertBlock(page, 'Content', 'Content, video placeholder');
  const canvas = page.frameLocator('.ve-canvas-frame');
  const player = canvas.locator('.b-content-video .b-player');
  await canvas.locator('.b-content-video .b-play').click();
  const link = page.locator('.ve-properties fieldset', { hasText: 'Video link' }).first();
  await link.getByLabel('Web address').fill('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
  await expect(player).toHaveAttribute(
    'data-embed-src',
    'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=1',
  );
  await canvas.locator('.b-content-video .b-play').click();
  await expect(player.locator('iframe')).toHaveCount(0);

  await page.getByRole('button', { name: 'Preview', exact: true }).click();
  await canvas.locator('.b-content-video .b-play').click();
  await expect(player.locator('iframe')).toHaveAttribute(
    'src',
    'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=1',
  );
  await page.getByRole('button', { name: 'Exit preview' }).click();
  await expect(player.locator('iframe')).toHaveCount(0);
});

test('the export dialog publishes to Netlify with a pasted token and remembers the site', async ({
  page,
}) => {
  const calls: string[] = [];
  await page.route('https://api.netlify.com/api/v1/**', async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname.replace('/api/v1', '');
    calls.push(`${request.method()} ${path} ${request.headers().authorization ?? ''}`);
    let body: Record<string, string> = { id: 'deploy-1', state: 'ready' };
    if (path === '/sites') body = { id: 'site-1' };
    if (path.endsWith('/deploys')) {
      body = { id: 'deploy-1', state: 'uploaded', ssl_url: 'https://fieldnote-demo.netlify.app' };
    }
    await route.fulfill({ json: body });
  });
  await createProject(page);
  await insertBlock(page, 'Headers', 'Hero, centered text');
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Export site' });
  await expect(dialog.getByRole('radio', { name: /Download a zip/ })).toBeChecked();
  await expect(dialog.getByLabel('Netlify access token')).toHaveCount(0);
  await dialog.getByRole('radio', { name: /Publish to Netlify/ }).check();
  const publish = dialog.getByRole('button', { name: 'Publish to Netlify' });
  await expect(publish).toBeDisabled();
  await dialog.getByLabel('Netlify access token').fill('nfp_test');
  await publish.click();
  const published = page.getByRole('dialog', { name: 'Site published' });
  await expect(
    published.getByRole('link', { name: 'https://fieldnote-demo.netlify.app' }),
  ).toBeVisible();
  expect(calls).toEqual([
    'POST /sites Bearer nfp_test',
    'POST /sites/site-1/deploys Bearer nfp_test',
    'GET /deploys/deploy-1 Bearer nfp_test',
  ]);
  const stored = await page.evaluate(() => localStorage.getItem('ve-settings') ?? '');
  expect(stored).toContain('site-1');
  expect(JSON.stringify(await storedProject(page))).not.toContain('nfp_test');
});
