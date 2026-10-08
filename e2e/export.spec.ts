import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { expect, test, type Page } from '@playwright/test';
import {
  addPage,
  closeLibraryDrawer,
  createProject,
  insertBlock,
  openLibraryTab,
  openPage,
  openProjectSettings,
  readZip,
} from './editor';

async function buildSite(page: Page): Promise<void> {
  await createProject(page);
  const settings = await openProjectSettings(page);
  await settings.getByLabel('Description').fill('Customer interviews, tagged and searchable.');
  await closeLibraryDrawer(page);
  await insertBlock(page, 'Navigations', 'Navigation, logo left');
  await insertBlock(page, 'Headers', 'Hero, centered text');
  await insertBlock(page, 'Features', 'Features grid, 3 columns');
  await insertBlock(page, 'Footers', 'Footer, simple');
}

async function downloadExport(page: Page): Promise<Map<string, Buffer>> {
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Export site' });
  await expect(dialog.getByRole('note')).toHaveText(
    /^Before you publishNo social image on Home\. .*Fix$/,
  );
  const downloadPromise = page.waitForEvent('download');
  await dialog.getByRole('button', { name: 'Download zip' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^untitled-site-\d{4}-\d{2}-\d{2}\.zip$/);
  const done = page.getByRole('dialog', { name: 'Site exported' });
  await expect(done.getByRole('status')).toContainText(`Saved ${download.suggestedFilename()} (`);
  await expect(done.getByRole('button', { name: 'Close' })).toBeFocused();
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

test('the export dialog lists warnings, fixes one in place and still lets the user export', async ({
  page,
}) => {
  await createProject(page);
  await addPage(page, 'About');
  await insertBlock(page, 'Headers', 'Hero, centered text');
  await page.locator('[id="ve-field-primaryButton-link-type"]').selectOption({ label: 'Page' });
  await page.locator('[id="ve-field-primaryButton-link-page"]').selectOption({ label: 'Home' });
  await openPage(page, 'Home');
  await openLibraryTab(page, 'Pages');
  await page.getByRole('button', { name: 'More actions for About' }).click();
  await page.getByRole('menuitem', { name: 'Set as home page' }).click();
  await page.getByRole('button', { name: 'More actions for Home' }).click();
  await page.getByRole('menuitem', { name: 'Delete…' }).click();
  await page.getByRole('button', { name: 'Delete page' }).click();
  await addPage(page, 'Contact');
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Export site' });
  const warning = dialog.getByRole('listitem').filter({
    hasText: '“Primary button” links to a page that was deleted',
  });
  await warning.getByRole('button', { name: 'Fix' }).click();
  await expect(dialog).toBeHidden();
  await expect(page.locator('.ve-panel-heading')).toContainText('Hero, centered text');

  await page.getByRole('button', { name: 'Export', exact: true }).click();
  const downloadPromise = page.waitForEvent('download');
  await dialog.getByRole('button', { name: 'Download zip' }).click();
  expect((await downloadPromise).suggestedFilename()).toMatch(/\.zip$/);
});

test('exporting the same project twice gives byte-identical zips', async ({ page }) => {
  await buildSite(page);
  const zips: Buffer[] = [];
  for (let attempt = 0; attempt < 2; attempt += 1) {
    await page.getByRole('button', { name: 'Export', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Export site' });
    const downloadPromise = page.waitForEvent('download');
    await dialog.getByRole('button', { name: 'Download zip' }).click();
    const download = await downloadPromise;
    zips.push(await readFile(await download.path()));
    const done = page.getByRole('dialog', { name: 'Site exported' });
    await done.getByRole('button', { name: 'Close' }).click();
    await expect(done).toBeHidden();
  }
  expect(zips[0]?.equals(zips[1] ?? Buffer.alloc(0))).toBe(true);
});

test('an uploaded image shows on the canvas and ships as its own file', async ({ page }) => {
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAIAAAABCAIAAAB7QOjdAAAAD0lEQVR4nGP4z8DAwPAfAAcAAf9+CLHQAAAAAElFTkSuQmCC',
    'base64',
  );
  await createProject(page);
  await insertBlock(page, 'Content', 'Content, text and image');
  await closeLibraryDrawer(page);
  await page.getByRole('button', { name: 'Change image' }).click();
  const imageDialog = page.getByRole('dialog', { name: 'Image' });
  await imageDialog
    .locator('input[type="file"]')
    .setInputFiles({ name: 'Team photo.png', mimeType: 'image/png', buffer: png });
  await expect(imageDialog.locator('.ve-image-preview')).toHaveAttribute(
    'src',
    /^data:image\/png;base64,/,
  );
  await expect(imageDialog.getByLabel('Shape')).toHaveCount(0);
  await imageDialog.getByRole('button', { name: 'Done' }).click();
  await expect(imageDialog).toBeHidden();

  const canvasImage = page.frameLocator('.ve-canvas-frame').locator('.b-content-text-image img');
  await expect(canvasImage).toHaveAttribute('src', /^data:image\/png;base64,/);
  await expect(canvasImage).toHaveAttribute('width', '2');
  await expect(canvasImage).toHaveAttribute('height', '1');

  await page.getByRole('button', { name: 'Export', exact: true }).click();
  const downloadPromise = page.waitForEvent('download');
  await page
    .getByRole('dialog', { name: 'Export site' })
    .getByRole('button', { name: 'Download zip' })
    .click();
  const files = readZip(await readFile(await (await downloadPromise).path()));
  const imagePaths = [...files.keys()].filter((path) => path.startsWith('assets/images/'));
  expect(imagePaths).toEqual([
    expect.stringMatching(/^assets\/images\/team-photo-[a-z0-9]+\.png$/),
  ]);
  const [imagePath = ''] = imagePaths;
  expect(files.get(imagePath)?.equals(png)).toBe(true);
  expect(files.get('index.html')?.toString('utf8')).toContain(`src="${imagePath}"`);
});
