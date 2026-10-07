import { expect, test, type Page } from '@playwright/test';
import { createProject, insertBlock } from './editor';

function canvasBackground(page: Page): Promise<string> {
  return page
    .frameLocator('.ve-canvas-frame')
    .locator('body')
    .evaluate((body) => getComputedStyle(body).backgroundColor);
}

function headingFont(page: Page): Promise<string> {
  return page
    .frameLocator('.ve-canvas-frame')
    .locator('h1')
    .evaluate((heading) => getComputedStyle(heading).fontFamily);
}

test('presets preview on hover, apply by group in one undo step and can be saved', async ({
  page,
}) => {
  await createProject(page);
  await insertBlock(page, 'Headers', 'Hero, centered text');
  await page.getByRole('button', { name: 'Design system' }).click();
  const white = await canvasBackground(page);
  const cleanFont = await headingFont(page);

  const midnight = page.locator('.ve-preset-card', { hasText: 'Midnight' });
  await midnight.hover();
  await expect.poll(() => canvasBackground(page)).toBe('rgb(11, 15, 26)');
  await page.locator('.ve-design-sheet-header').hover();
  await expect.poll(() => canvasBackground(page)).toBe(white);

  await midnight.getByRole('button', { name: 'Apply Midnight' }).click();
  const dialog = page.getByRole('dialog', { name: 'Apply “Midnight”' });
  await dialog.getByLabel('Typography').uncheck();
  await dialog.getByRole('button', { name: 'Apply', exact: true }).click();
  await expect.poll(() => canvasBackground(page)).toBe('rgb(11, 15, 26)');
  expect(await headingFont(page)).toBe(cleanFont);

  await page.keyboard.press('ControlOrMeta+Z');
  await expect.poll(() => canvasBackground(page)).toBe(white);

  await page.getByRole('button', { name: 'Save current as preset…' }).click();
  await page
    .getByRole('dialog', { name: 'Save as preset' })
    .getByLabel('Preset name')
    .fill('Brand');
  await page.getByRole('button', { name: 'Save preset' }).click();
  await expect(page.getByRole('list', { name: 'My presets' })).toContainText('Brand');
  await page.reload();
  await page.getByRole('button', { name: 'Design system' }).click();
  await expect(page.getByRole('list', { name: 'My presets' })).toContainText('Brand');
});
