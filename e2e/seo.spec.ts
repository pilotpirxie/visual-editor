import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { addPage, createProject, openProjectSettings, readZip } from './editor';

test('a base URL adds a sitemap of indexed pages and a robots file', async ({ page }) => {
  await createProject(page);
  const settings = await openProjectSettings(page);
  await settings.getByLabel('Base URL').fill('https://fieldnote.app');
  await settings.getByRole('button', { name: 'Done' }).click();
  await addPage(page, 'Thanks');
  await page.getByRole('switch', { name: 'Hide from search engines' }).check();

  await page.getByRole('button', { name: 'Export', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Export site' });
  const note = dialog.getByRole('note');
  await expect(note).toContainText(
    'Site: No meta description on Home. Add one in Project settings or in each page’s settings.',
  );
  await expect(note).toContainText('Site: No social image on Home.');
  await expect(note).not.toContainText('Thanks');
  const downloadPromise = page.waitForEvent('download');
  await dialog.getByRole('button', { name: 'Export anyway' }).click();
  const files = readZip(await readFile(await (await downloadPromise).path()));

  const sitemap = files.get('sitemap.xml')?.toString('utf8') ?? '';
  expect(sitemap).toContain('<loc>https://fieldnote.app/</loc>');
  expect(sitemap).not.toContain('thanks.html');
  expect(files.get('robots.txt')?.toString('utf8')).toContain(
    'Sitemap: https://fieldnote.app/sitemap.xml',
  );
  expect(files.get('thanks.html')?.toString('utf8')).toContain(
    '<meta name="robots" content="noindex">',
  );
  expect(files.get('index.html')?.toString('utf8')).not.toContain('name="robots"');
});

test('without a base URL there is no sitemap or robots file', async ({ page }) => {
  await createProject(page);
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Export site' });
  const downloadPromise = page.waitForEvent('download');
  await dialog.getByRole('button', { name: /Download zip|Export anyway/ }).click();
  const files = readZip(await readFile(await (await downloadPromise).path()));
  expect(files.has('sitemap.xml')).toBe(false);
  expect(files.has('robots.txt')).toBe(false);
});
