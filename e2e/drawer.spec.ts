import { expect, test } from '@playwright/test';
import { createProject } from './editor';

test.use({ viewport: { width: 1100, height: 800 } });

test('below 1700 px the rail opens the library over the canvas and it closes after use', async ({
  page,
}) => {
  await createProject(page);
  const content = page.locator('.ve-library-content');
  const blocksTab = page.locator('.ve-library').getByRole('tab', { name: 'Blocks' });
  await expect(blocksTab).toBeVisible();
  await expect(content).toBeHidden();
  const canvasWidth = await page.locator('.ve-canvas').evaluate((element) => element.clientWidth);
  expect(canvasWidth).toBeGreaterThan(700);

  await blocksTab.click();
  await expect(content).toBeVisible();
  await expect(blocksTab).toBeFocused();
  await content.locator('.ve-categories button', { hasText: 'Headers' }).click();
  await content.getByRole('button', { name: 'Hero, centered text' }).click();
  await expect(content).toBeHidden();
  await expect(page.frameLocator('.ve-canvas-frame').locator('h1')).toBeVisible();

  await blocksTab.click();
  await expect(content).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(content).toBeHidden();
  await expect(blocksTab).toBeFocused();

  await blocksTab.click();
  await expect(content).toBeVisible();
  await blocksTab.click();
  await expect(content).toBeHidden();
});

test('the canvas shows the desktop layout by default and scales it to fit', async ({ page }) => {
  await createProject(page);
  await expect(page.locator('.ve-canvas-width')).toHaveText('1024 px');
  await expect(page.locator('.ve-canvas-zoom')).toBeVisible();
});

test('from 1700 px the library stays docked and the rail collapses it', async ({ page }) => {
  await page.setViewportSize({ width: 1800, height: 900 });
  await createProject(page);
  const content = page.locator('.ve-library-content');
  const blocksTab = page.locator('.ve-library').getByRole('tab', { name: 'Blocks' });
  await expect(content).toBeVisible();
  await blocksTab.click();
  await expect(content).toBeHidden();
  await blocksTab.click();
  await expect(content).toBeVisible();
});

test('the empty page offers a button that opens the block library', async ({ page }) => {
  await createProject(page);
  await page.getByRole('button', { name: 'Add a block' }).click();
  await expect(page.locator('.ve-library-content')).toBeVisible();
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
