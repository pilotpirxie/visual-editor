import { expect, test, type Page } from '@playwright/test';
import { createProject, insertBlock } from './editor';

async function addPage(page: Page, name: string): Promise<void> {
  await page.locator('.ve-page-switcher').click();
  await page.locator('.ve-page-switcher-menu').getByRole('button', { name: 'Add page' }).click();
  const dialog = page.getByRole('dialog', { name: 'Add page' });
  await dialog.getByLabel('Name').fill(name);
  await dialog.getByRole('button', { name: 'Add page' }).click();
  await expect(page.locator('.ve-page-switcher-name')).toHaveText(name);
}

async function switchToPage(page: Page, name: string): Promise<void> {
  await page.locator('.ve-page-switcher').click();
  await page.locator('.ve-page-switcher-list').getByRole('button', { name }).click();
  await expect(page.locator('.ve-page-switcher-name')).toHaveText(name);
}

async function markCanvasDocument(page: Page): Promise<void> {
  await page.evaluate(() => {
    const view = document.querySelector<HTMLIFrameElement>('.ve-canvas-frame')?.contentWindow;
    if (view) Object.assign(view, { keptAlive: true });
  });
}

async function isCanvasDocumentKept(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const view = document.querySelector<HTMLIFrameElement>('.ve-canvas-frame')?.contentWindow;
    return view !== null && view !== undefined && 'keptAlive' in view;
  });
}

async function canvasScrollY(page: Page): Promise<number> {
  return page.evaluate(
    () =>
      document.querySelector<HTMLIFrameElement>('.ve-canvas-frame')?.contentWindow?.scrollY ?? 0,
  );
}

async function linkHeroButtonTo(page: Page, pageName: string): Promise<void> {
  await page.locator('[id="ve-field-primaryButton-link-type"]').selectOption({ label: 'Page' });
  await page.locator('[id="ve-field-primaryButton-link-page"]').selectOption({ label: pageName });
}

test.beforeEach(async ({ page }) => {
  await createProject(page);
});

test('a renamed and re-slugged page keeps every link to it working', async ({ page }) => {
  await addPage(page, 'About');
  await switchToPage(page, 'Home');
  await insertBlock(page, 'Headers', 'Hero, centered text');
  await linkHeroButtonTo(page, 'About');
  const button = page.frameLocator('.ve-canvas-frame').locator('[data-field="primaryButton"]');
  await expect(button).toHaveAttribute('href', 'about.html');

  await page.locator('.ve-library [role="tab"]', { hasText: 'Pages' }).click();
  await page.getByRole('button', { name: 'More actions for About' }).click();
  await page.getByRole('button', { name: 'Rename…' }).click();
  const dialog = page.getByRole('dialog', { name: 'Rename page' });
  await dialog.getByLabel('Name').fill('Our story');
  await dialog.getByLabel('Slug').fill('company');
  await dialog.getByRole('button', { name: 'Save' }).click();

  await expect(page.locator('.ve-page-row', { hasText: 'Our story' })).toContainText(
    'company.html',
  );
  await expect(button).toHaveAttribute('href', 'company.html');
});

test('the switcher, Back and Forward and a reload move between pages, each reopening where it was left', async ({
  page,
}) => {
  for (let count = 0; count < 4; count += 1) {
    await insertBlock(page, 'Content', 'Content, text and image');
  }
  const homeUrl = page.url();
  const homeScrollY = await canvasScrollY(page);
  expect(homeScrollY).toBeGreaterThan(0);
  await markCanvasDocument(page);

  await addPage(page, 'About');
  await expect(page).not.toHaveURL(homeUrl);
  await expect(page.frameLocator('.ve-canvas-frame').locator('[data-block-id]')).toHaveCount(0);
  await expect(page.locator('.ve-properties h2')).toHaveText('Page settings');

  await page.goBack();
  await expect(page.locator('.ve-page-switcher-name')).toHaveText('Home');
  await expect(page).toHaveURL(homeUrl);
  await expect(page.frameLocator('.ve-canvas-frame').locator('[data-block-id]')).toHaveCount(4);
  await expect.poll(() => canvasScrollY(page)).toBeCloseTo(homeScrollY, -1);
  await expect(page.locator('.ve-properties-title')).toHaveText('Content, text and image');

  await page.goForward();
  await expect(page.locator('.ve-page-switcher-name')).toHaveText('About');
  await switchToPage(page, 'Home');
  await expect(page.frameLocator('.ve-canvas-frame').locator('[data-block-id]')).toHaveCount(4);
  expect(await isCanvasDocumentKept(page)).toBe(true);

  await switchToPage(page, 'About');
  await expect(page.locator('.ve-save-status')).toHaveText('Saved in browser');
  await page.reload();
  await expect(page.locator('.ve-page-switcher-name')).toHaveText('About');
});

test('Preview follows a link to another page inside the same canvas', async ({ page }) => {
  await addPage(page, 'About');
  await insertBlock(page, 'Call to action', 'Call to action, centered');
  await switchToPage(page, 'Home');
  await insertBlock(page, 'Headers', 'Hero, centered text');
  await linkHeroButtonTo(page, 'About');
  await markCanvasDocument(page);
  const canvas = page.frameLocator('.ve-canvas-frame');

  await canvas.locator('[data-field="primaryButton"]').click();
  await expect(page.locator('.ve-page-switcher-name')).toHaveText('Home');

  await page.getByRole('button', { name: 'Preview' }).click();
  await expect(page.locator('.ve-library')).toBeHidden();
  await canvas.locator('[data-field="primaryButton"]').click();
  await expect(page.locator('.ve-page-switcher-name')).toHaveText('About');
  await expect(canvas.locator('[data-component="cta-centered"]')).toBeVisible();
  expect(await isCanvasDocumentKept(page)).toBe(true);

  await page.keyboard.press('Escape');
  await expect(page.locator('.ve-library')).toBeVisible();
});
