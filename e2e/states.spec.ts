import { expect, test } from '@playwright/test';
import { createProject, insertBlock } from './editor';

test('the editor opens even when icon sets cannot load, and says so', async ({ page }) => {
  await page.route(/virtual:icon-set/, (route) => route.abort());
  await createProject(page);
  await expect(page.getByText('Some icons couldn’t load.')).toBeVisible();
  await insertBlock(page, 'Headers', 'Hero, centered text');
  await expect(page.frameLocator('.ve-canvas-frame').locator('h1')).toBeVisible();
});

test('a loading message shows before the app starts', async ({ page }) => {
  let releaseApp = () => {};
  const appRequested = new Promise<void>((resolve) => {
    void page.route(/\/src\/main\.tsx/, async (route) => {
      resolve();
      await new Promise<void>((release) => {
        releaseApp = release;
      });
      await route.continue();
    });
  });
  const navigation = page.goto('/');
  await appRequested;
  await expect(page.getByRole('status')).toHaveText('Loading Visual Editor…');
  releaseApp();
  await navigation;
  await expect(page.getByRole('heading', { name: 'My projects' })).toBeVisible();
});

test('a browser without popovers gets a clear message instead of a broken editor', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Reflect.deleteProperty(HTMLElement.prototype, 'showPopover');
  });
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: 'This browser can’t run Visual Editor' }),
  ).toBeVisible();
  await expect(page.getByText('Missing: popovers.')).toBeVisible();
});
