import { expect, test, type Page } from '@playwright/test';
import { addPage, createProject, insertBlock } from './editor';

function canvas(page: Page) {
  return page.frameLocator('.ve-canvas-frame');
}

async function selectHeroOnCanvas(page: Page): Promise<void> {
  await canvas(page)
    .locator('[data-component="hero-centered"]')
    .click({ position: { x: 8, y: 8 } });
  await expect(page.locator('.ve-block-toolbar')).toBeVisible();
}

test('a copied block pastes onto another page and into a project in another tab', async ({
  page,
  context,
}) => {
  await createProject(page);
  await insertBlock(page, 'Headers', 'Hero, centered text');
  await page.locator('#ve-field-title').fill('Copied hero');
  await selectHeroOnCanvas(page);
  await page.keyboard.press('ControlOrMeta+C');

  await addPage(page, 'About');
  await canvas(page)
    .locator('#ve-page')
    .click({ position: { x: 8, y: 8 } });
  await page.keyboard.press('ControlOrMeta+V');
  await expect(canvas(page).locator('[data-component="hero-centered"] h1')).toHaveText(
    'Copied hero',
  );

  const otherTab = await context.newPage();
  await createProject(otherTab);
  await canvas(otherTab)
    .locator('#ve-page')
    .click({ position: { x: 8, y: 8 } });
  await otherTab.keyboard.press('ControlOrMeta+V');
  await expect(canvas(otherTab).locator('[data-component="hero-centered"] h1')).toHaveText(
    'Copied hero',
  );
});

test('cut removes the block and undo brings it back in one step', async ({ page }) => {
  await createProject(page);
  await insertBlock(page, 'Headers', 'Hero, centered text');
  await selectHeroOnCanvas(page);
  await page.keyboard.press('ControlOrMeta+X');
  await expect(canvas(page).locator('[data-component="hero-centered"]')).toHaveCount(0);
  await page.keyboard.press('ControlOrMeta+Z');
  await expect(canvas(page).locator('[data-component="hero-centered"]')).toHaveCount(1);
});
