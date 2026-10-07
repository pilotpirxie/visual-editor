import { expect, test } from '@playwright/test';
import { createProject } from './editor';

test('project settings change the site title for every page and survive a reload', async ({
  page,
}) => {
  await createProject(page);
  await page.locator('.ve-project-title').click();
  const dialog = page.getByRole('dialog', { name: 'Project settings' });
  await dialog.getByLabel('Site title').fill('Acme Research');
  await dialog.getByLabel('Description').fill('Customer interviews, tagged.');
  await dialog.getByLabel('Language').selectOption('pl');
  await dialog.getByLabel('Base URL').fill('https://acme.example');
  await expect(dialog).toContainText('Example: “About | Acme Research”');
  await dialog.getByRole('button', { name: 'Done' }).click();

  await expect(page.locator('.ve-project-title')).toHaveText('Acme Research');
  const canvasLanguage = page.frameLocator('.ve-canvas-frame').locator('html').getAttribute('lang');
  expect(await canvasLanguage).toBe('pl');

  await expect(page.locator('.ve-save-status')).toHaveText('Saved in browser');
  await page.reload();
  await page.locator('.ve-project-title').click();
  await expect(
    page.getByRole('dialog', { name: 'Project settings' }).getByLabel('Base URL'),
  ).toHaveValue('https://acme.example');
});
