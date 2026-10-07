import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import { createProject, insertBlock } from './editor';

async function saveByDownload(page: Page): Promise<string> {
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'File', exact: true }).click();
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
  await page.locator('.ve-project-title').click();
  await page
    .getByRole('dialog', { name: 'Project settings' })
    .getByLabel('Site title')
    .fill('Acme Research');
  await page.getByRole('button', { name: 'Done' }).click();
  await insertBlock(page, 'Headers', 'Hero, centered text');
  await page.locator('#ve-field-title').fill('Saved to disk');
  await expect(page.locator('.ve-save-status')).toHaveText('Saved in browser');

  const savedText = await saveByDownload(page);
  await expect(page.locator('.ve-file-status')).toHaveText('Downloaded acme-research.json');
  await page.locator('#ve-field-title').fill('Changed after saving');
  await expect(page.locator('.ve-file-status')).toContainText('changes not saved to file');

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
  await expect(page.locator('.ve-project-title')).toHaveText('Acme Research');
  await expect(
    page.frameLocator('.ve-canvas-frame').locator('[data-component="hero-centered"] h1'),
  ).toHaveText('Saved to disk');
  await expect(page.locator('.ve-save-status')).toHaveText('Saved in browser');
  expect(await saveByDownload(page)).toBe(savedText);
});

test('opening a file of a project the browser already has offers a copy', async ({ page }) => {
  await createProject(page);
  await page.locator('.ve-project-title').click();
  await page
    .getByRole('dialog', { name: 'Project settings' })
    .getByLabel('Site title')
    .fill('Acme Research');
  await page.getByRole('button', { name: 'Done' }).click();
  const savedText = await saveByDownload(page);
  await insertBlock(page, 'Headers', 'Hero, centered text');
  await expect(page.locator('.ve-save-status')).toHaveText('Saved in browser');

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
  await expect(page.locator('.ve-project-title')).toHaveText('Copy of Acme Research');
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
