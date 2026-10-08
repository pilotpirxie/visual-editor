import { expect, test } from '@playwright/test';
import { createProject } from './editor';

test.use({ viewport: { width: 1100, height: 800 } });

test('between 1024 and 1279 px the library opens over the canvas and closes after use', async ({
  page,
}) => {
  await createProject(page);
  const library = page.locator('#ve-library');
  const toggle = page.getByRole('button', { name: 'Library', exact: true });
  await expect(library).toBeHidden();
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  const canvasWidth = await page.locator('.ve-canvas').evaluate((element) => element.clientWidth);
  expect(canvasWidth).toBeGreaterThan(700);

  await toggle.click();
  await expect(library).toBeVisible();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await expect(library.getByRole('tab', { name: 'Blocks' })).toBeFocused();
  await library.locator('.ve-categories button', { hasText: 'Headers' }).click();
  await library.getByRole('button', { name: 'Hero, centered text' }).click();
  await expect(library).toBeHidden();
  await expect(page.frameLocator('.ve-canvas-frame').locator('h1')).toBeVisible();

  await toggle.click();
  await expect(library).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(library).toBeHidden();
  await expect(toggle).toBeFocused();
});

test('the empty page offers a button that opens the block library', async ({ page }) => {
  await createProject(page);
  await page.getByRole('button', { name: 'Add a block' }).click();
  await expect(page.locator('#ve-library')).toBeVisible();
  await expect(page.locator('.ve-blocks-search input')).toBeFocused();
});

test('the editor has no horizontal overflow at 1024 px', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await createProject(page);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
  const toolbar = page.locator('.ve-toolbar');
  const isToolbarClipped = await toolbar.evaluate(
    (element) => element.scrollWidth > element.clientWidth,
  );
  expect(isToolbarClipped).toBe(false);
});
