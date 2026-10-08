import { expect, test, type Page } from '@playwright/test';
import { createProject, insertBlock } from './editor';

function canvasHeading(page: Page): ReturnType<ReturnType<Page['frameLocator']>['locator']> {
  return page.frameLocator('.ve-canvas-frame').locator('h1');
}

function canvasBackground(page: Page): Promise<string> {
  return page
    .frameLocator('.ve-canvas-frame')
    .locator('body')
    .evaluate((body) => getComputedStyle(body).backgroundColor);
}

function headingStyle(page: Page, property: 'fontFamily' | 'fontWeight'): Promise<string> {
  return canvasHeading(page).evaluate((heading, name) => getComputedStyle(heading)[name], property);
}

function fontsHref(page: Page): Promise<string | null> {
  return page
    .frameLocator('.ve-canvas-frame')
    .locator('link[href*="fonts.googleapis.com/css2"]')
    .first()
    .getAttribute('href');
}

async function openPresets(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Design', exact: true }).click();
}

test.beforeEach(async ({ page }) => {
  await createProject(page);
  await insertBlock(page, 'Headers', 'Hero, centered text');
});

test('presets open first in the design panel and apply by group in one undo step', async ({
  page,
}) => {
  await page.getByRole('button', { name: 'Design', exact: true }).click();
  const list = page.getByRole('list', { name: 'Presets' });
  await expect(list.getByRole('listitem')).toHaveCount(12);
  await expect(page.getByRole('button', { name: 'Save current as preset…' })).toHaveCount(0);

  const white = await canvasBackground(page);
  const cleanFont = await headingStyle(page, 'fontFamily');
  await list.getByRole('listitem').filter({ hasText: 'Midnight' }).hover();
  expect(await canvasBackground(page)).toBe(white);

  await page.getByRole('button', { name: 'Apply Midnight' }).click();
  const dialog = page.getByRole('dialog', { name: 'Apply Midnight' });
  await dialog.getByLabel('Typography').uncheck();
  await dialog.getByRole('button', { name: 'Apply', exact: true }).click();
  await expect.poll(() => canvasBackground(page)).toBe('rgb(11, 15, 26)');
  expect(await headingStyle(page, 'fontFamily')).toBe(cleanFont);

  await page.keyboard.press('ControlOrMeta+Z');
  await expect.poll(() => canvasBackground(page)).toBe(white);
});

test('a heading font with one weight is never faked bold and loads only that weight', async ({
  page,
}) => {
  await openPresets(page);
  await page.getByRole('button', { name: 'Apply Warm' }).click();
  await page
    .getByRole('dialog', { name: 'Apply Warm' })
    .getByRole('button', { name: 'Apply', exact: true })
    .click();
  await expect.poll(() => headingStyle(page, 'fontFamily')).toContain('DM Serif Display');
  expect(await headingStyle(page, 'fontWeight')).toBe('400');
  await expect.poll(() => fontsHref(page)).toContain('family=DM+Serif+Display:wght@400&');
  expect(await fontsHref(page)).toContain('family=DM+Sans:wght@400;700&');
});

test('the heading weight comes from the weights the heading font offers', async ({ page }) => {
  await page.getByRole('button', { name: 'Design', exact: true }).click();
  const weight = page.getByLabel('Heading weight');
  await expect(weight.locator('option')).toHaveCount(9);
  await weight.selectOption('900');
  await expect.poll(() => headingStyle(page, 'fontWeight')).toBe('900');
  await expect.poll(() => fontsHref(page)).toContain('family=Inter:wght@400;700;900&');
});
