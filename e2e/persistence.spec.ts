import { expect, test } from '@playwright/test';
import { createProject, insertBlock, storedProject } from './editor';

test('edits are saved in the browser and come back after a reload', async ({ page }) => {
  await createProject(page);
  await insertBlock(page, 'Headers', 'Hero, centered text');
  const title = page.locator('[data-field-path="title"] textarea');
  await title.fill('Persisted title');
  await expect
    .poll(async () => JSON.stringify((await storedProject(page))?.blocks ?? {}))
    .toContain('Persisted title');

  await page.reload();
  const canvas = page.frameLocator('.ve-canvas-frame');
  await expect(canvas.locator('h1')).toHaveText('Persisted title');

  await page.getByRole('link', { name: 'My projects' }).click();
  await expect(page.locator('.ve-home-card')).toHaveCount(1);
});

test('an edit made right before a reload is not lost', async ({ page }) => {
  await createProject(page);
  await insertBlock(page, 'Headers', 'Hero, centered text');
  await page.locator('[data-field-path="title"] textarea').fill('Typed just before leaving');
  page.once('dialog', (dialog) => void dialog.accept());
  await page.reload();
  await expect(page.frameLocator('.ve-canvas-frame').locator('h1')).toHaveText(
    'Typed just before leaving',
  );
});
