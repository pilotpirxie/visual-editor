import { expect, test, type Page } from '@playwright/test';
import { createProject, insertBlock } from './editor';

const RED = 'rgb(255, 0, 0)';

async function openPropertiesTab(page: Page, tab: 'content' | 'style' | 'advanced'): Promise<void> {
  await page.locator(`#ve-properties-tab-${tab}`).click();
}

test.beforeEach(async ({ page }) => {
  await createProject(page);
  await insertBlock(page, 'Headers', 'Hero, centered text');
  await insertBlock(page, 'Call to action', 'Call to action, centered');
});

test('a design token or a type scale change updates every block at once', async ({ page }) => {
  const canvas = page.frameLocator('.ve-canvas-frame');
  const heroButton = canvas.locator('[data-component="hero-centered"] .btn-primary');
  const ctaButton = canvas.locator('[data-component="cta-centered"] .btn-primary');
  const heading = canvas.locator('[data-component="hero-centered"] h1');
  const headingSizeBefore = await heading.evaluate((element) => getComputedStyle(element).fontSize);

  await page.getByRole('button', { name: 'Design system' }).click();
  const sheet = page.getByRole('complementary', { name: 'Design system' });
  await sheet.locator('[id="ve-token---color-primary"]').fill('#ff0000');
  await expect(heroButton).toHaveCSS('background-color', RED);
  await expect(ctaButton).toHaveCSS('background-color', RED);

  await sheet.locator('#ve-type-base').fill('22');
  await expect
    .poll(() => heading.evaluate((element) => getComputedStyle(element).fontSize))
    .not.toBe(headingSizeBefore);

  await page.keyboard.press('Escape');
  await expect(sheet).toBeHidden();
});

test('a block override applies to that block only and resets to the design value', async ({
  page,
}) => {
  const canvas = page.frameLocator('.ve-canvas-frame');
  const cta = canvas.locator('[data-component="cta-centered"]');
  const hero = canvas.locator('[data-component="hero-centered"]');

  await openPropertiesTab(page, 'style');
  const row = page.locator('.ve-override[data-token="--color-background"]');
  await row.getByRole('button', { name: 'Override' }).click();
  await row.getByTitle('Custom color').click();
  await row.getByLabel('Background: hex value').fill('#ff0000');
  await expect(cta).toHaveCSS('background-color', RED);
  await expect(hero).not.toHaveCSS('background-color', RED);

  await row.getByRole('button', { name: 'Reset Background to the design value' }).click();
  await expect(cta).not.toHaveCSS('background-color', RED);
  await expect(cta).not.toHaveAttribute('style', /--color-background/);
});

test('a block hidden on phones shows striped at phone width and stays selectable', async ({
  page,
}) => {
  await openPropertiesTab(page, 'advanced');
  await page.locator('.ve-hide-on').getByRole('checkbox', { name: 'Phone' }).check();
  const shade = page.locator('.ve-outline--hidden');
  await expect(shade).toHaveCount(0);

  await page.getByRole('group', { name: 'Device' }).getByRole('button', { name: 'Phone' }).click();
  await expect(shade).toHaveCount(1);
  await expect(shade).toContainText('Hidden on phone');

  await page.keyboard.press('Escape');
  await expect(page.locator('.ve-properties-title')).toHaveText('Page settings');
  await page.frameLocator('.ve-canvas-frame').locator('[data-component="cta-centered"]').click();
  await expect(page.locator('.ve-properties-title')).toHaveText('Call to action, centered');
});
