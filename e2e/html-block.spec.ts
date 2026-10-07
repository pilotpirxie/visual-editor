import { expect, test, type Page } from '@playwright/test';
import { boxOf, createProject, insertBlock } from './editor';

function canvas(page: Page) {
  return page.frameLocator('.ve-canvas-frame');
}

async function heroLook(page: Page) {
  const title = canvas(page).locator('h1');
  const button = canvas(page).locator('.btn-primary');
  return {
    title: await boxOf(title),
    titleColor: await title.evaluate((element) => getComputedStyle(element).color),
    buttonBackground: await button.evaluate((element) => getComputedStyle(element).backgroundColor),
  };
}

async function convertHero(page: Page): Promise<void> {
  await page.locator('[role="tab"]', { hasText: 'Advanced' }).click();
  await page.getByRole('button', { name: 'Convert to HTML…' }).click();
  const dialog = page.getByRole('dialog', { name: 'Convert “Hero, centered text” to HTML?' });
  await dialog.getByRole('button', { name: 'Convert to HTML' }).click();
  await expect(page.locator('.ve-properties-title')).toHaveText('HTML block');
}

test('a converted block looks the same and its code can be edited', async ({ page }) => {
  await createProject(page);
  await insertBlock(page, 'Headers', 'Hero, centered text');
  const before = await heroLook(page);
  await convertHero(page);
  expect(await heroLook(page)).toEqual(before);

  const code = page.getByRole('textbox', { name: 'HTML' });
  await expect(code).toContainText('b-hero-centered');
  await code.fill(
    '<section class="b-hero-centered section"><h1 onclick="alert(1)">Edited by hand</h1></section>',
  );
  await expect(canvas(page).locator('h1')).toHaveText('Edited by hand');
  await expect(page.locator('.ve-properties')).toContainText(
    'Removed for safety: onclick attribute.',
  );
  await expect(canvas(page).locator('h1')).not.toHaveAttribute('onclick', /.*/);
});

test('undo right after converting brings the block back', async ({ page }) => {
  await createProject(page);
  await insertBlock(page, 'Headers', 'Hero, centered text');
  await convertHero(page);
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(page.locator('.ve-properties-title')).toHaveText('Hero, centered text');
});
