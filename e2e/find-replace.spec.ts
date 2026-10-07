import { expect, test } from '@playwright/test';
import { addPage, createProject, insertBlock, openPage } from './editor';

test('find and replace changes text on every page in one undo step', async ({ page }) => {
  await createProject(page);
  await insertBlock(page, 'Headers', 'Hero, centered text');
  await page.locator('#ve-field-title').fill('Acme for research teams');
  await addPage(page, 'About');
  await insertBlock(page, 'Headers', 'Hero, centered text');
  await page.locator('#ve-field-title').fill('About Acme');

  await page.getByRole('button', { name: /^Edit/ }).click();
  await page.getByRole('menuitem', { name: 'Find and replace…' }).click();
  const dialog = page.getByRole('dialog', { name: 'Find and replace' });
  await dialog.getByLabel('Find').fill('acme');
  await expect(dialog.getByRole('status')).toHaveText('2 matches in 2 fields');
  await dialog.getByLabel('Replace with').fill('Fieldnote');
  await dialog.getByRole('button', { name: 'Replace 2 matches' }).click();
  await expect(dialog.getByRole('status')).toHaveText('No matches for “acme”.');
  await dialog.getByRole('button', { name: 'Close' }).click();

  const heading = page.frameLocator('.ve-canvas-frame').locator('h1');
  await expect(heading).toHaveText('About Fieldnote');
  await openPage(page, 'Home');
  await expect(heading).toHaveText('Fieldnote for research teams');
  await page.keyboard.press('ControlOrMeta+Z');
  await expect(heading).toHaveText('Acme for research teams');
});
