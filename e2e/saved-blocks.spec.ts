import { expect, test } from '@playwright/test';
import { createProject, insertBlock, openLibraryTab } from './editor';

test('a saved block keeps its content and can be added to another project', async ({ page }) => {
  await createProject(page);
  await insertBlock(page, 'Headers', 'Hero, centered text');
  await page.locator('#ve-field-title').fill('Launch faster with Fieldnote');

  await page.getByRole('button', { name: /^Edit/ }).click();
  await page.getByRole('menuitem', { name: 'Save block…' }).click();
  const dialog = page.getByRole('dialog', { name: 'Save block' });
  await dialog.getByLabel('Name').fill('Launch hero');
  await dialog.getByRole('button', { name: 'Save block' }).click();
  await expect(page.getByText('Saved “Launch hero”')).toBeVisible();

  await createProject(page);
  await openLibraryTab(page, 'Blocks');
  await page.locator('.ve-my-blocks button', { hasText: 'Saved blocks' }).click();
  await page.getByRole('button', { name: 'Launch hero', exact: true }).click();
  await expect(page.frameLocator('.ve-canvas-frame').locator('h1')).toHaveText(
    'Launch faster with Fieldnote',
  );

  await openLibraryTab(page, 'Blocks');
  await page.getByRole('button', { name: 'More actions for “Launch hero”' }).click();
  await page.getByRole('menuitem', { name: 'Delete' }).click();
  await page
    .locator('.ve-saved-block')
    .getByRole('button', { name: 'Delete', exact: true })
    .click();
  await expect(page.locator('.ve-my-blocks')).toHaveCount(0);
});
