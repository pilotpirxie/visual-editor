import { expect, test, type Page } from '@playwright/test';

function previewBackground(page: Page): Promise<string> {
  return page
    .frameLocator('.ve-starter-frame')
    .locator('body')
    .evaluate((body) => getComputedStyle(body).backgroundColor);
}

test('a starter previews every page on every device and starts a new project', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'New project' }).click();
  const newProject = page.getByRole('dialog', { name: 'New project' });
  await newProject.getByRole('tab', { name: 'Starters' }).click();
  await expect(newProject.locator('.ve-starter-card')).toHaveCount(3);
  await newProject.getByRole('button', { name: 'Preview SaaS product' }).click();

  const preview = page.getByRole('dialog', { name: 'SaaS product' });
  const frame = preview.locator('.ve-starter-frame');
  await expect(page.frameLocator('.ve-starter-frame').locator('h1')).toBeVisible();
  await expect(frame).toHaveCSS('width', '1440px');
  await preview.getByRole('button', { name: 'Tablet' }).click();
  await expect(frame).toHaveCSS('width', '768px');
  await preview.getByRole('button', { name: 'Phone' }).click();
  await expect(frame).toHaveCSS('width', '375px');
  await preview.getByRole('button', { name: 'Desktop' }).click();

  await page
    .frameLocator('.ve-starter-frame')
    .getByRole('link', { name: 'Pricing' })
    .first()
    .click();
  await expect(preview.getByLabel('Page')).toHaveValue('pricing');
  await expect(page.frameLocator('.ve-starter-frame').locator('h1')).toBeVisible();

  const cleanBackground = await previewBackground(page);
  await preview.getByLabel('Design').selectOption('midnight');
  await expect.poll(() => previewBackground(page)).toBe('rgb(11, 15, 26)');
  expect(cleanBackground).not.toBe('rgb(11, 15, 26)');

  await preview.getByRole('button', { name: 'Use this starter' }).click();
  await expect(page.locator('.ve-toolbar')).toBeVisible();
  await expect(page.locator('.ve-project-title')).toHaveText('Fieldnote');
  const canvas = page.frameLocator('.ve-canvas-frame');
  await expect(canvas.locator('h1')).toBeVisible();
  await expect
    .poll(() => canvas.locator('body').evaluate((body) => getComputedStyle(body).backgroundColor))
    .toBe('rgb(11, 15, 26)');

  await page.locator('.ve-page-switcher').click();
  await expect(page.locator('.ve-page-switcher-menu').getByRole('button')).toContainText([
    'Home',
    'Features',
    'Pricing',
    'About',
    'Contact',
    'Page not found',
  ]);
});

test('a blank project starts from the chosen preset and site name', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'New project' }).click();
  await page.getByLabel('Site name').fill('Harbor Bakery');
  await page.getByRole('button', { name: 'Start with Midnight' }).click();
  await expect(page.locator('.ve-project-title')).toHaveText('Harbor Bakery');
  await expect
    .poll(() =>
      page
        .frameLocator('.ve-canvas-frame')
        .locator('body')
        .evaluate((body) => getComputedStyle(body).backgroundColor),
    )
    .toBe('rgb(11, 15, 26)');
});
