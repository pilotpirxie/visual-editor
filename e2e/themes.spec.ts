import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import { createProject, insertBlock, readZip } from './editor';

const WHITE = 'rgb(255, 255, 255)';
const CLEAN_PRIMARY = 'rgb(79, 70, 229)';
const CLEAN_DARK_BACKGROUND = 'rgb(17, 24, 39)';
const CLEAN_DARK_TEXT = 'rgb(249, 250, 251)';
const CLEAN_DARK_ACCENT = 'rgb(165, 180, 252)';

async function chooseTheme(page: Page, label: string): Promise<void> {
  await page
    .getByRole('group', { name: 'Section theme' })
    .getByText(label, { exact: true })
    .click();
}

async function exportedFiles(page: Page): Promise<Map<string, Buffer>> {
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  const downloadPromise = page.waitForEvent('download');
  await page
    .getByRole('dialog', { name: 'Export site' })
    .getByRole('button', { name: 'Download zip' })
    .click();
  return readZip(await readFile(await (await downloadPromise).path()));
}

test('a section theme recolors one block, keeps buttons visible and undoes in one step', async ({
  page,
}) => {
  await createProject(page);
  await insertBlock(page, 'Headers', 'Hero, centered text');
  await page.locator('#ve-properties-tab-style').click();
  const canvas = page.frameLocator('.ve-canvas-frame');
  const hero = canvas.locator('[data-component="hero-centered"]');
  const heading = hero.locator('h1');
  const primaryButton = hero.locator('.btn-primary');

  await chooseTheme(page, 'Dark');
  await expect(hero).toHaveCSS('background-color', CLEAN_DARK_BACKGROUND);
  await expect(heading).toHaveCSS('color', CLEAN_DARK_TEXT);
  await expect(primaryButton).toHaveCSS('background-color', CLEAN_DARK_ACCENT);

  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(hero).toHaveCSS('background-color', WHITE);
  await expect(hero).not.toHaveAttribute('style', /--color/);

  await chooseTheme(page, 'Primary');
  await expect(hero).toHaveCSS('background-color', CLEAN_PRIMARY);
  await expect(primaryButton).toHaveCSS('background-color', WHITE);
  await expect(primaryButton).toHaveCSS('color', CLEAN_PRIMARY);

  const files = await exportedFiles(page);
  expect(files.get('index.html')?.toString('utf8')).toContain(
    '--color-background: var(--theme-primary-background)',
  );
  expect(files.get('assets/css/site.css')?.toString('utf8')).toContain(
    '--theme-primary-background: var(--color-primary);',
  );
});

test('dark section colors are edited in the design system and follow into themed blocks', async ({
  page,
}) => {
  await createProject(page);
  await insertBlock(page, 'Call to action', 'Call to action, centered');
  await page.locator('#ve-properties-tab-style').click();
  await chooseTheme(page, 'Dark');
  const cta = page.frameLocator('.ve-canvas-frame').locator('[data-component="cta-centered"]');

  await page.getByRole('button', { name: 'Design', exact: true }).click();
  const sheet = page.getByRole('complementary', { name: 'Design' });
  await sheet.getByRole('heading', { name: 'Dark sections' }).click();
  await sheet.locator('[id="ve-token---theme-dark-background"]').fill('#000000');
  await expect(cta).toHaveCSS('background-color', 'rgb(0, 0, 0)');
});
