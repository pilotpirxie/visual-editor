import { expect, test, type Page } from '@playwright/test';
import { createProject, insertBlock, layerNames } from './editor';

async function openSnapshots(page: Page) {
  await page.getByRole('button', { name: /^File/ }).click();
  await page.getByRole('menuitem', { name: 'Snapshots…' }).click();
  return page.getByRole('dialog', { name: 'Snapshots' });
}

test('applying a preset takes a snapshot, and a restore can be undone', async ({ page }) => {
  await createProject(page);
  await insertBlock(page, 'Headers', 'Hero, centered text');

  const manual = await openSnapshots(page);
  await expect(manual.getByText('No snapshots yet.')).toBeVisible();
  await manual.getByLabel('Name').fill('Only the hero');
  await manual.getByRole('button', { name: 'Take snapshot' }).click();
  await expect(manual.getByText('Only the hero')).toBeVisible();
  await manual.getByRole('button', { name: 'Close' }).click();
  await insertBlock(page, 'Features', 'Features grid, 3 columns');

  await page.getByRole('button', { name: 'Design', exact: true }).click();
  await page.getByRole('button', { name: 'Apply Midnight' }).click();
  await page
    .getByRole('dialog', { name: 'Apply Midnight' })
    .getByRole('button', { name: 'Apply', exact: true })
    .click();
  await page.getByRole('button', { name: 'Close design' }).click();

  const dialog = await openSnapshots(page);
  const auto = dialog.getByRole('listitem').filter({ hasText: 'Before applying Midnight' });
  await expect(auto.getByText('Auto')).toBeVisible();
  await dialog
    .getByRole('listitem')
    .filter({ hasText: 'Only the hero' })
    .getByRole('button', { name: 'Restore' })
    .click();
  await expect(page.getByText('Restored “Only the hero”')).toBeVisible();
  expect(await layerNames(page)).toEqual(['Hero, centered text']);

  await page.keyboard.press('ControlOrMeta+Z');
  expect(await layerNames(page)).toEqual(['Hero, centered text', 'Features grid, 3 columns']);
});
