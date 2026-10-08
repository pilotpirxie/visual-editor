import { expect, test, type Page } from '@playwright/test';
import { openLibraryTab } from './editor';

const STARTERS_LOAD_TIMEOUT_MS = 15_000;

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
  await expect(newProject.locator('.ve-starter-card')).toHaveCount(8, {
    timeout: STARTERS_LOAD_TIMEOUT_MS,
  });
  await newProject.getByRole('group', { name: 'Use case' }).getByText('Local and events').click();
  await expect(newProject.locator('.ve-starter-name')).toHaveText([
    'Event or conference',
    'Restaurant or cafe',
  ]);
  await newProject
    .getByRole('group', { name: 'Use case' })
    .getByText('All', { exact: true })
    .click();
  await expect(newProject.locator('.ve-starter-card')).toHaveCount(8);
  await newProject.getByRole('button', { name: 'Preview SaaS product' }).click();

  const preview = page.getByRole('dialog', { name: 'SaaS product' });
  const frame = preview.locator('.ve-starter-frame');
  await expect(page.frameLocator('.ve-starter-frame').locator('h1')).toBeVisible();
  await expect(frame).toHaveCSS('width', '1440px');
  await preview.locator('label', { hasText: 'Tablet (768 px)' }).click();
  await expect(frame).toHaveCSS('width', '768px');
  await preview.locator('label', { hasText: 'Phone (375 px)' }).click();
  await expect(frame).toHaveCSS('width', '375px');
  await preview.locator('label', { hasText: 'Desktop (1440 px)' }).click();

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
  await expect(page).toHaveTitle('Fieldnote – Visual Editor');
  const canvas = page.frameLocator('.ve-canvas-frame');
  await expect(canvas.locator('h1')).toBeVisible();
  await expect
    .poll(() => canvas.locator('body').evaluate((body) => getComputedStyle(body).backgroundColor))
    .toBe('rgb(11, 15, 26)');

  await openLibraryTab(page, 'Pages');
  await expect(page.locator('.ve-page-name > span:first-child')).toHaveText([
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
  await expect(page).toHaveTitle('Harbor Bakery – Visual Editor');
  await expect
    .poll(() =>
      page
        .frameLocator('.ve-canvas-frame')
        .locator('body')
        .evaluate((body) => getComputedStyle(body).backgroundColor),
    )
    .toBe('rgb(11, 15, 26)');
});
