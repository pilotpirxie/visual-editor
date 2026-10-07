import { expect, test, type Page } from '@playwright/test';
import { layerNames, openLibraryTab, storedProject } from './editor';

async function pressUntilFocused(page: Page, key: string, name: RegExp): Promise<void> {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const focusedName = await page.evaluate(() => {
      const element = document.activeElement;
      return element?.getAttribute('aria-label') ?? element?.textContent?.trim() ?? '';
    });
    if (name.test(focusedName)) return;
    await page.keyboard.press(key);
  }
  throw new Error(`Never reached an element named ${name}`);
}

test('a whole page can be built and exported with the keyboard alone', async ({
  page,
  browserName,
}) => {
  const tabKey = browserName === 'webkit' ? 'Alt+Tab' : 'Tab';
  await page.goto('/');
  await pressUntilFocused(page, tabKey, /^New project$/);
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog', { name: 'New project' })).toBeVisible();
  await pressUntilFocused(page, tabKey, /^Start with Clean$/);
  await page.keyboard.press('Enter');
  await expect(page.locator('.ve-toolbar')).toBeVisible();

  const search = page.getByRole('searchbox', { name: 'Search blocks' });
  await search.focus();
  await page.keyboard.type('features grid 3');
  await page.keyboard.press(tabKey);
  await page.keyboard.press('Enter');
  await search.fill('hero centered');
  await search.focus();
  await page.keyboard.press(tabKey);
  await page.keyboard.press('Enter');
  expect(await layerNames(page)).toEqual(['Features grid, 3 columns', 'Hero, centered text']);

  await expect
    .poll(async () => Object.keys((await storedProject(page))?.blocks.entities ?? {}).length)
    .toBe(2);
  await page.reload();
  await expect(page.locator('.ve-toolbar')).toBeVisible();
  await page.keyboard.press(tabKey);
  await expect(page.getByRole('link', { name: 'Skip to canvas' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('main', { name: 'Canvas' })).toBeFocused();
  await page.keyboard.press('ArrowUp');
  await expect(page.locator('#ve-live-announcer')).toHaveText(/selected, \d of 2$/);

  await openLibraryTab(page, 'Layers');
  const rows = page.locator('.ve-layer-name');
  await rows.first().focus();
  await page.keyboard.press('ArrowDown');
  await expect(rows.nth(1)).toBeFocused();
  await page.keyboard.press('Enter');
  await page.keyboard.press('Alt+ArrowUp');
  await expect(rows).toHaveText(['Hero, centered text', 'Features grid, 3 columns']);
  await expect(page.locator('#ve-live-announcer')).toHaveText(
    'Moved Hero, centered text to position 1 of 2',
  );
  await page.keyboard.press('Shift+F10');
  const menu = page.getByRole('menu');
  await expect(menu.getByRole('menuitem', { name: 'Duplicate' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(rows).toHaveCount(3);

  await page.keyboard.press('ControlOrMeta+K');
  await expect(page.getByRole('combobox', { name: 'Type a command' })).toBeFocused();
  await page.keyboard.type('export site');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog', { name: 'Export site' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Export site' })).toHaveCount(0);
  await page.keyboard.press('ControlOrMeta+Z');
  await expect(rows).toHaveCount(2);
});
