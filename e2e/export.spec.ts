import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { expect, test, type Page } from '@playwright/test';
import { addPage, createProject, insertBlock, openPage, readZip } from './editor';

async function buildSite(page: Page): Promise<void> {
  await createProject(page);
  await insertBlock(page, 'Navigations', 'Navigation, logo left');
  await insertBlock(page, 'Headers', 'Hero, centered text');
  await insertBlock(page, 'Features', 'Features grid, 3 columns');
  await insertBlock(page, 'Footers', 'Footer, simple');
}

async function downloadExport(page: Page): Promise<Map<string, Buffer>> {
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Export site' });
  await expect(dialog).toContainText('Everything looks ready');
  const downloadPromise = page.waitForEvent('download');
  await dialog.getByRole('button', { name: 'Download zip' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^untitled-site-\d{4}-\d{2}-\d{2}\.zip$/);
  return readZip(await readFile(await download.path()));
}

test('the exported zip holds pages, one CSS file, one JS file and works from disk', async ({
  page,
}, testInfo) => {
  await buildSite(page);
  const files = await downloadExport(page);
  expect([...files.keys()].sort()).toEqual([
    'assets/css/site.css',
    'assets/js/site.js',
    'index.html',
    'licenses.txt',
  ]);
  const html = files.get('index.html')?.toString('utf8') ?? '';
  expect(html).not.toMatch(/data-block-id|data-field/);
  expect(html).toContain('<use href="#icon-lucide-zap"></use>');
  expect(files.get('assets/css/site.css')?.toString('utf8')).not.toContain('b-cta-centered');

  const folder = testInfo.outputPath('site');
  for (const [path, content] of files) {
    const target = join(folder, path);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, content);
  }
  await page.goto(pathToFileURL(join(folder, 'index.html')).href);
  const button = page.locator('.b-hero-centered .btn-primary');
  await expect(button).toBeVisible();
  expect(await button.evaluate((element) => getComputedStyle(element).backgroundColor)).not.toBe(
    'rgba(0, 0, 0, 0)',
  );
  await expect(page.locator('.b-features-grid-3 svg.icon').first()).toBeVisible();

  await page.setViewportSize({ width: 375, height: 800 });
  await page.getByRole('button', { name: 'Menu' }).click();
  await expect(page.locator('.b-menu').getByRole('link', { name: 'Features' })).toBeVisible();
});

test('the export dialog lists warnings first and still lets the user export', async ({ page }) => {
  await createProject(page);
  await addPage(page, 'About');
  await insertBlock(page, 'Headers', 'Hero, centered text');
  await page.locator('[id="ve-field-primaryButton-link-type"]').selectOption({ label: 'Page' });
  await page.locator('[id="ve-field-primaryButton-link-page"]').selectOption({ label: 'Home' });
  await openPage(page, 'Home');
  await page.getByRole('button', { name: 'More actions for About' }).click();
  await page.getByRole('menuitem', { name: 'Set as home page' }).click();
  await page.getByRole('button', { name: 'More actions for Home' }).click();
  await page.getByRole('menuitem', { name: 'Delete…' }).click();
  await page.getByRole('button', { name: 'Delete page' }).click();
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Export site' });
  await expect(dialog).toContainText('“Primary button” links to a page that was deleted');
  const downloadPromise = page.waitForEvent('download');
  await dialog.getByRole('button', { name: 'Export anyway' }).click();
  expect((await downloadPromise).suggestedFilename()).toMatch(/\.zip$/);
});
