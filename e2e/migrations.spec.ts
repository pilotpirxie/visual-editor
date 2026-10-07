import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';

const FIXTURE = join(import.meta.dirname, '../src/persistence/fixtures/project-v2.json');

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    Reflect.deleteProperty(window, 'showOpenFilePicker');
    Reflect.deleteProperty(window, 'showSaveFilePicker');
  });
});

test('a project file saved before section themes opens, looks the same and can use themes', async ({
  page,
}) => {
  await page.goto('/');
  const chooserPromise = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Open from disk' }).click();
  const chooser = await chooserPromise;
  await chooser.setFiles({
    name: 'fieldnote.json',
    mimeType: 'application/json',
    buffer: await readFile(FIXTURE),
  });
  await expect(page).toHaveTitle('Fieldnote (saved before themes) – Visual Editor');

  const canvas = page.frameLocator('.ve-canvas-frame');
  const stats = canvas.locator('[data-component="stats-row"]');
  await expect(stats).toBeVisible();
  await expect(stats).not.toHaveAttribute('data-behavior', /counter/);

  await canvas.locator('[data-component="hero-screenshot"] h1').click();
  await page.locator('#ve-properties-tab-style').click();
  await page
    .getByRole('group', { name: 'Section theme' })
    .getByText('Dark', { exact: true })
    .click();
  await expect(canvas.locator('[data-component="hero-screenshot"]')).toHaveCSS(
    'background-color',
    'rgb(17, 24, 39)',
  );
});
