import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import { createProject, insertBlock, openProjectSettings, storedProject } from './editor';

async function saveByDownload(page: Page): Promise<string> {
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: /^File/ }).click();
  await page.getByRole('menuitem', { name: 'Save to disk' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('acme-research.json');
  const path = await download.path();
  return readFile(path, 'utf8');
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    Reflect.deleteProperty(window, 'showOpenFilePicker');
    Reflect.deleteProperty(window, 'showSaveFilePicker');
    Reflect.deleteProperty(window, 'showDirectoryPicker');
  });
});

test('a project saved to disk opens again identical after it was deleted', async ({ page }) => {
  await createProject(page);
  const settings = await openProjectSettings(page);
  await settings.getByLabel('Site title').fill('Acme Research');
  await page.getByRole('button', { name: 'Done' }).click();
  await insertBlock(page, 'Headers', 'Hero, centered text');
  await page.locator('#ve-field-title').fill('Saved to disk');
  await expect.poll(async () => (await storedProject(page))?.settings.title).toBe('Acme Research');

  const savedText = await saveByDownload(page);
  await expect(page.getByRole('button', { name: 'File', exact: true })).toBeVisible();
  await page.locator('#ve-field-title').fill('Changed after saving');
  await expect(page.getByRole('button', { name: 'File, changes not saved to file' })).toBeVisible();

  await page.goto('/');
  page.once('dialog', (dialog) => void dialog.accept());
  await page.getByRole('button', { name: 'Delete Acme Research' }).click();
  await expect(page.getByRole('button', { name: 'Delete Acme Research' })).toHaveCount(0);

  const chooserPromise = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Open from disk' }).click();
  const chooser = await chooserPromise;
  await chooser.setFiles({
    name: 'acme-research.json',
    mimeType: 'application/json',
    buffer: Buffer.from(savedText),
  });
  await expect(page).toHaveTitle('Acme Research – Visual Editor');
  await expect(
    page.frameLocator('.ve-canvas-frame').locator('[data-component="hero-centered"] h1'),
  ).toHaveText('Saved to disk');
  await expect.poll(async () => (await storedProject(page))?.settings.title).toBe('Acme Research');
  expect(await saveByDownload(page)).toBe(savedText);
});

test('opening a file of a project the browser already has offers a copy', async ({ page }) => {
  await createProject(page);
  const settings = await openProjectSettings(page);
  await settings.getByLabel('Site title').fill('Acme Research');
  await page.getByRole('button', { name: 'Done' }).click();
  const savedText = await saveByDownload(page);
  await insertBlock(page, 'Headers', 'Hero, centered text');
  await expect
    .poll(async () => Object.keys((await storedProject(page))?.blocks.entities ?? {}).length)
    .toBeGreaterThan(0);

  const chooserPromise = page.waitForEvent('filechooser');
  await page.keyboard.press('ControlOrMeta+O');
  const chooser = await chooserPromise;
  await chooser.setFiles({
    name: 'acme-research.json',
    mimeType: 'application/json',
    buffer: Buffer.from(savedText),
  });
  const dialog = page.getByRole('dialog', { name: '“Acme Research” is already in this browser' });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Open as copy' }).click();
  await expect(page).toHaveTitle('Copy of Acme Research – Visual Editor');
});

test('a file that is not a project shows an error and changes nothing', async ({ page }) => {
  await page.goto('/');
  const chooserPromise = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Open from disk' }).click();
  const chooser = await chooserPromise;
  await chooser.setFiles({
    name: 'notes.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{}'),
  });
  await expect(page.getByRole('alert')).toContainText('Opening the file failed');
  await expect(page.getByRole('heading', { name: 'My projects' })).toBeVisible();
});
