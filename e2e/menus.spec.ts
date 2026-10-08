import { expect, test, type Page } from '@playwright/test';
import { createProject, insertBlock, layerNames } from './editor';

function canvas(page: Page) {
  return page.frameLocator('.ve-canvas-frame');
}

async function addHeroAndCta(page: Page): Promise<void> {
  await createProject(page);
  await insertBlock(page, 'Headers', 'Hero, centered text');
  await insertBlock(page, 'Call to action', 'Call to action, centered');
}

test('right-clicking a block on the canvas opens its actions at the pointer', async ({ page }) => {
  await addHeroAndCta(page);
  await canvas(page)
    .locator('[data-component="hero-centered"]')
    .click({ button: 'right', position: { x: 20, y: 20 } });
  const menu = page.getByRole('menu', { name: 'Hero, centered text actions' });
  await expect(menu).toBeVisible();
  await menu.getByRole('menuitem', { name: 'Duplicate' }).click();
  await expect(canvas(page).locator('[data-component="hero-centered"]')).toHaveCount(2);
  await expect(menu).toBeHidden();
});

test('the Layers tab offers the same actions on right-click', async ({ page }) => {
  await addHeroAndCta(page);
  await page.locator('.ve-library [role="tab"]', { hasText: 'Layers' }).click();
  await page.locator('.ve-layer', { hasText: 'Hero, centered text' }).click({ button: 'right' });
  await page.getByRole('menuitem', { name: 'Move down' }).click();
  expect(await layerNames(page)).toEqual(['Call to action, centered', 'Hero, centered text']);
});

test('the block toolbar More menu and the Edit menu work together with undo', async ({ page }) => {
  await addHeroAndCta(page);
  await page.getByRole('button', { name: 'More actions' }).click();
  await page.getByRole('menuitem', { name: 'Delete' }).click();
  await expect(canvas(page).locator('[data-component="cta-centered"]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Undo' }).click();
  await expect(canvas(page).locator('[data-component="cta-centered"]')).toHaveCount(1);
});

test('arrow keys move the selection on the canvas and Cmd+P toggles Preview', async ({ page }) => {
  await addHeroAndCta(page);
  await canvas(page)
    .locator('[data-component="cta-centered"]')
    .click({ position: { x: 20, y: 20 } });
  await page.keyboard.press('ArrowUp');
  await expect(page.locator('.ve-properties .ui-title')).toHaveText('Hero, centered text');
  await page.keyboard.press('ArrowDown');
  await expect(page.locator('.ve-properties .ui-title')).toHaveText('Call to action, centered');
  await page.keyboard.press('ControlOrMeta+P');
  await expect(page.locator('.ve-shell')).toHaveAttribute('data-preview', /.*/);
  await expect(page.locator('.ve-toolbar')).toBeHidden();
  await page.keyboard.press('ControlOrMeta+P');
  await expect(page.locator('.ve-shell')).not.toHaveAttribute('data-preview', /.*/);
  await expect(page.locator('.ve-toolbar')).toBeVisible();
});

test('Preview hides the toolbar and a floating button exits it', async ({ page }) => {
  await addHeroAndCta(page);
  await page.getByRole('button', { name: 'Preview', exact: true }).click();
  await expect(page.locator('.ve-toolbar')).toBeHidden();
  await page.locator('.ve-preview-exit').getByRole('button', { name: 'Exit preview' }).click();
  await expect(page.locator('.ve-shell')).not.toHaveAttribute('data-preview', /.*/);
  await expect(page.locator('.ve-toolbar')).toBeVisible();
  await expect(page.locator('.ve-preview-exit')).toHaveCount(0);
});
