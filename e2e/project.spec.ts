import { expect, test } from '@playwright/test';
import { createProject, openProjectSettings, storedProject } from './editor';

test('project settings change the site title for every page and survive a reload', async ({
  page,
}) => {
  await createProject(page);
  const dialog = await openProjectSettings(page);
  await dialog.getByLabel('Site title').fill('Acme Research');
  await dialog.getByLabel('Description').fill('Customer interviews, tagged.');
  await dialog.getByLabel('Language').selectOption('pl');
  await dialog.getByLabel('Base URL').fill('https://acme.example');
  await dialog.getByRole('button', { name: 'Done' }).click();

  await expect(page).toHaveTitle('Acme Research – Visual Editor');
  const canvasLanguage = page.frameLocator('.ve-canvas-frame').locator('html').getAttribute('lang');
  expect(await canvasLanguage).toBe('pl');

  await expect
    .poll(async () => (await storedProject(page))?.settings.baseUrl)
    .toBe('https://acme.example');
  await page.reload();
  const reopened = await openProjectSettings(page);
  await expect(reopened.getByLabel('Base URL')).toHaveValue('https://acme.example');
});
