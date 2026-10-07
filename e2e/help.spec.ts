import { expect, test } from '@playwright/test';
import { createProject } from './editor';

test('icon buttons show their name as a tooltip on hover and keyboard focus', async ({
  page,
  browserName,
}) => {
  const tabKey = browserName === 'webkit' ? 'Alt+Tab' : 'Tab';
  await createProject(page);
  const designButton = page.getByRole('button', { name: 'Design system' });
  await designButton.hover();
  const tooltip = page.locator('.ui-tooltip');
  await expect(tooltip).toHaveText('Design system');
  await page.mouse.move(0, 400);
  await expect(tooltip).toHaveCount(0);

  await designButton.focus();
  await page.keyboard.press(`Shift+${tabKey}`);
  await expect(page.getByRole('button', { name: 'Help' })).toBeFocused();
  await expect(page.locator('.ui-tooltip')).toContainText('Help');
  await page.keyboard.press('Escape');
  await expect(page.locator('.ui-tooltip')).toHaveCount(0);
});

test('help opens from the toolbar and the question mark key and lists the shortcuts', async ({
  page,
}) => {
  await createProject(page);
  await page.getByRole('button', { name: 'Help' }).click();
  const help = page.getByRole('dialog', { name: 'Help' });
  await expect(help.getByText('Open the command palette')).toBeVisible();
  await expect(help.locator('kbd').first()).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(help).toHaveCount(0);

  await page.locator('body').click({ position: { x: 5, y: 600 } });
  await page.keyboard.press('Shift+Slash');
  await expect(help).toBeVisible();
  await help.getByRole('button', { name: 'Open-source licenses' }).click();
  await expect(page.getByRole('dialog', { name: 'Open-source licenses' })).toBeVisible();
});
