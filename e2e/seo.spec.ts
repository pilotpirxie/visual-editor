import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { addPage, closeLibraryDrawer, createProject, openProjectSettings, readZip } from './editor';

test('a base URL adds a sitemap of indexed pages and a robots file', async ({ page }) => {
  await createProject(page);
  const settings = await openProjectSettings(page);
  await settings.getByLabel('Base URL').fill('https://fieldnote.app');
  await closeLibraryDrawer(page);
  await addPage(page, 'Thanks');
  await page.getByRole('switch', { name: 'Hide from search engines' }).check();

  await page.getByRole('button', { name: 'Export', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Export site' });
  const note = dialog.getByRole('note');
  await expect(note).toContainText(
    'No meta description on Home. Add one in Project settings or in each page’s settings.',
  );
  await expect(note).toContainText('No social image on Home.');
  await expect(note).not.toContainText('Thanks');
  await expect(note).not.toContainText('Site:');
  const downloadPromise = page.waitForEvent('download');
  await dialog.getByRole('button', { name: 'Download zip' }).click();
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
  await dialog.getByRole('button', { name: 'Download zip' }).click();
  const files = readZip(await readFile(await (await downloadPromise).path()));
  expect(files.has('sitemap.xml')).toBe(false);
  expect(files.has('robots.txt')).toBe(false);
});

test('site meta defaults reach every page and a page can override them', async ({ page }) => {
  await createProject(page);
  const settings = await openProjectSettings(page);
  await settings.getByLabel('Base URL').fill('https://fieldnote.app');
  await settings.getByLabel('Keywords').fill('research, interviews');
  await settings.getByText('Social sharing').click();
  await settings.getByLabel('X account of the site').fill('fieldnote');
  await settings.getByText('Sitemap and robots.txt').click();
  await settings.getByRole('switch', { name: 'Block AI training crawlers' }).check();
  await closeLibraryDrawer(page);
  await addPage(page, 'Contact');
  const properties = page.locator('.ve-properties');
  await properties.getByLabel('Follow links').selectOption('no');
  await properties.getByText('Structured data').click();
  await properties.getByLabel('Kind of page').selectOption('ContactPage');

  await page.getByRole('button', { name: 'Export', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Export site' });
  const downloadPromise = page.waitForEvent('download');
  await dialog.getByRole('button', { name: 'Download zip' }).click();
  const files = readZip(await readFile(await (await downloadPromise).path()));

  const home = files.get('index.html')?.toString('utf8') ?? '';
  expect(home).toContain('<meta name="keywords" content="research, interviews">');
  expect(home).toContain('<meta name="twitter:site" content="@fieldnote">');
  expect(home).not.toContain('name="robots"');
  expect(home).toContain('"@type": "WebSite"');
  const contact = files.get('contact.html')?.toString('utf8') ?? '';
  expect(contact).toContain('<meta name="robots" content="nofollow">');
  expect(contact).toContain('<meta name="keywords" content="research, interviews">');
  expect(contact).toContain('"@type": "ContactPage"');
  const robots = files.get('robots.txt')?.toString('utf8') ?? '';
  expect(robots).toContain('User-agent: GPTBot');
  expect(robots).toContain('Sitemap: https://fieldnote.app/sitemap.xml');
});
