import { expect, test, type Page } from '@playwright/test';
import { createProject, insertBlock, layerNames } from './editor';

function canvas(page: Page) {
  return page.frameLocator('.ve-canvas-frame');
}

type PageLook = { background: string; prefersDark: boolean };

async function pageLook(page: Page): Promise<PageLook> {
  return canvas(page)
    .locator('body')
    .evaluate((body) => ({
      background: getComputedStyle(body).backgroundColor,
      prefersDark: (body.ownerDocument.defaultView ?? window).matchMedia(
        '(prefers-color-scheme: dark)',
      ).matches,
    }));
}

async function toggleDarkMode(page: Page): Promise<void> {
  await page.getByRole('button', { name: /^File/ }).click();
  await page.getByRole('menuitemcheckbox', { name: 'Dark mode' }).click();
}

async function addHeroAndCta(page: Page): Promise<void> {
  await createProject(page);
  await insertBlock(page, 'Headers', 'Hero, centered text');
  await insertBlock(page, 'Call to action', 'Call to action, centered');
}

test('right-clicking a block on the canvas opens its actions at the pointer', async ({ page }) => {
  await addHeroAndCta(page);
  await canvas(page)
    .locator('[data-component="hero-centered"]')
    .click({ button: 'right', position: { x: 20, y: 20 } });
  const menu = page.getByRole('menu', { name: 'Hero, centered text actions' });
  await expect(menu).toBeVisible();
  await menu.getByRole('menuitem', { name: 'Duplicate' }).click();
  await expect(canvas(page).locator('[data-component="hero-centered"]')).toHaveCount(2);
  await expect(menu).toBeHidden();
});

test('the Layers tab offers the same actions on right-click', async ({ page }) => {
  await addHeroAndCta(page);
  await page.locator('.ve-library [role="tab"]', { hasText: 'Layers' }).click();
  await page.locator('.ve-layer', { hasText: 'Hero, centered text' }).click({ button: 'right' });
  await page.getByRole('menuitem', { name: 'Move down' }).click();
  expect(await layerNames(page)).toEqual(['Call to action, centered', 'Hero, centered text']);
});

test('the block toolbar More menu and the Edit menu work together with undo', async ({ page }) => {
  await addHeroAndCta(page);
  await page.getByRole('button', { name: 'More actions' }).click();
  await page.getByRole('menuitem', { name: 'Delete' }).click();
  await expect(canvas(page).locator('[data-component="cta-centered"]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Undo' }).click();
  await expect(canvas(page).locator('[data-component="cta-centered"]')).toHaveCount(1);
});

test('arrow keys move the selection on the canvas and Cmd+P toggles Preview', async ({ page }) => {
  await addHeroAndCta(page);
  await canvas(page)
    .locator('[data-component="cta-centered"]')
    .click({ position: { x: 20, y: 20 } });
  await page.keyboard.press('ArrowUp');
  await expect(page.locator('.ve-properties .ui-title')).toHaveText('Hero, centered text');
  await page.keyboard.press('ArrowDown');
  await expect(page.locator('.ve-properties .ui-title')).toHaveText('Call to action, centered');
  await page.keyboard.press('ControlOrMeta+P');
  await expect(page.locator('.ve-shell')).toHaveAttribute('data-preview', /.*/);
  await expect(page.locator('.ve-toolbar')).toBeHidden();
  await page.keyboard.press('ControlOrMeta+P');
  await expect(page.locator('.ve-shell')).not.toHaveAttribute('data-preview', /.*/);
  await expect(page.locator('.ve-toolbar')).toBeVisible();
});

test('Preview hides the toolbar and a floating button exits it', async ({ page }) => {
  await addHeroAndCta(page);
  await page.getByRole('button', { name: 'Preview', exact: true }).click();
  await expect(page.locator('.ve-toolbar')).toBeHidden();
  await page.locator('.ve-preview-exit').getByRole('button', { name: 'Exit preview' }).click();
  await expect(page.locator('.ve-shell')).not.toHaveAttribute('data-preview', /.*/);
  await expect(page.locator('.ve-toolbar')).toBeVisible();
  await expect(page.locator('.ve-preview-exit')).toHaveCount(0);
});

test('closing a toolbar menu with Escape returns focus to its button', async ({ page }) => {
  await createProject(page);
  const fileButton = page.getByRole('button', { name: 'File', exact: true });
  await fileButton.focus();
  await page.keyboard.press('Enter');
  const menu = page.getByRole('menu', { name: 'File' });
  await expect(menu).toBeVisible();
  await expect(fileButton).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.press('Escape');
  await expect(menu).toBeHidden();
  await expect(fileButton).toBeFocused();
  await expect(fileButton).toHaveAttribute('aria-expanded', 'false');
  await expect(page.locator('.ve-toolbar')).toBeVisible();
  await expect(page.getByText('Something went wrong')).toHaveCount(0);
});

test('Dark mode restyles the editor, survives a reload and leaves the page as it was', async ({
  page,
}) => {
  await addHeroAndCta(page);
  const root = page.locator('html');
  for (const colorScheme of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme });
    const lightLook = await pageLook(page);
    await toggleDarkMode(page);
    await expect(root).toHaveAttribute('data-ve-appearance', 'dark');
    await expect(page.locator('.ve-toolbar')).toHaveCSS('background-color', 'rgb(27, 29, 35)');
    expect(await pageLook(page)).toEqual(lightLook);
    await toggleDarkMode(page);
    await expect(root).not.toHaveAttribute('data-ve-appearance', /.*/);
    await expect(page.locator('.ve-toolbar')).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  }
  await toggleDarkMode(page);
  await page.reload();
  await expect(root).toHaveAttribute('data-ve-appearance', 'dark');
  await expect(page.locator('.ve-toolbar')).toHaveCSS('background-color', 'rgb(27, 29, 35)');
  await page.getByRole('button', { name: /^File/ }).click();
  await expect(page.getByRole('menuitemcheckbox', { name: 'Dark mode' })).toBeChecked();
});

test('the saved appearance applies before the app starts', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('ve-appearance', 'dark'));
  await page.route(/\/src\/main\.tsx/, (route) => route.abort());
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('html')).toHaveAttribute('data-ve-appearance', 'dark');
  await expect(page.locator('.ve-boot')).toBeVisible();
});

test('the home screen switch and other tabs follow the appearance', async ({ page, context }) => {
  await createProject(page);
  const home = await context.newPage();
  await home.goto('/');
  const homeSwitch = home.getByRole('switch', { name: 'Dark mode' });
  await expect(homeSwitch).not.toBeChecked();
  await toggleDarkMode(page);
  await expect(home.locator('html')).toHaveAttribute('data-ve-appearance', 'dark');
  await expect(homeSwitch).toBeChecked();
  await homeSwitch.click();
  await expect(home.locator('html')).not.toHaveAttribute('data-ve-appearance', /.*/);
  await expect(page.locator('html')).not.toHaveAttribute('data-ve-appearance', /.*/);
});
