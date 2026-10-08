import { expect, test } from '@playwright/test';
import { addPage, createProject, expectCurrentPage, layerNames } from './editor';

test('the command palette inserts blocks, opens pages, switches devices and exports', async ({
  page,
}) => {
  await createProject(page);
  await addPage(page, 'Pricing');

  const palette = page.getByRole('dialog', { name: 'Command palette' });
  await page.keyboard.press('ControlOrMeta+K');
  await palette.getByRole('combobox').fill('faq accordion');
  await page.keyboard.press('Enter');
  await expect(palette).toHaveCount(0);
  expect(await layerNames(page)).toContain('FAQ, accordion');

  await page.keyboard.press('ControlOrMeta+K');
  await palette.getByRole('combobox').fill('go home');
  await page.keyboard.press('Enter');
  await expectCurrentPage(page, 'Home');

  await page.keyboard.press('ControlOrMeta+K');
  await palette.getByRole('combobox').fill('show phone');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('radio', { name: 'Phone (375 px)' })).toBeChecked();

  const exportButton = page.getByRole('button', { name: 'Export', exact: true });
  await exportButton.focus();
  await page.keyboard.press('ControlOrMeta+K');
  await palette.getByRole('combobox').fill('export');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('Enter');
  const exportDialog = page.getByRole('dialog', { name: 'Export site' });
  await expect(exportDialog).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(exportDialog).toHaveCount(0);
  await expect(exportButton).toBeFocused();
});
