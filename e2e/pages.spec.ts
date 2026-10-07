import { expect, test, type Page } from '@playwright/test';
import {
  addPage,
  createProject,
  expectCurrentPage,
  insertBlock,
  openPage,
  storedProject,
} from './editor';

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
  await openPage(page, 'Home');
  await insertBlock(page, 'Headers', 'Hero, centered text');
  await linkHeroButtonTo(page, 'About');
  const button = page.frameLocator('.ve-canvas-frame').locator('[data-field="primaryButton"]');
  await expect(button).toHaveAttribute('href', 'about.html');

  await page.locator('.ve-library [role="tab"]', { hasText: 'Pages' }).click();
  await page.getByRole('button', { name: 'More actions for About' }).click();
  await page.getByRole('menuitem', { name: 'Rename…' }).click();
  const dialog = page.getByRole('dialog', { name: 'Rename page' });
  await dialog.getByLabel('Name').fill('Our story');
  await dialog.getByLabel('Slug').fill('company');
  await dialog.getByRole('button', { name: 'Save' }).click();

  await expect(page.locator('.ve-page-row', { hasText: 'Our story' })).toContainText(
    'company.html',
  );
  await expect(button).toHaveAttribute('href', 'company.html');
});

test('the Pages tab, Back and Forward and a reload move between pages, each reopening where it was left', async ({
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
  await expectCurrentPage(page, 'Home');
  await expect(page).toHaveURL(homeUrl);
  await expect(page.frameLocator('.ve-canvas-frame').locator('[data-block-id]')).toHaveCount(4);
  await expect.poll(() => canvasScrollY(page)).toBeCloseTo(homeScrollY, -1);
  await expect(page.locator('.ve-properties .ui-title')).toHaveText('Content, text and image');

  await page.goForward();
  await expectCurrentPage(page, 'About');
  await openPage(page, 'Home');
  await expect(page.frameLocator('.ve-canvas-frame').locator('[data-block-id]')).toHaveCount(4);
  expect(await isCanvasDocumentKept(page)).toBe(true);

  await openPage(page, 'About');
  await expect.poll(async () => (await storedProject(page))?.pages.ids.length).toBe(2);
  await page.reload();
  await expectCurrentPage(page, 'About');
});

test('Preview follows a link to another page inside the same canvas', async ({ page }) => {
  await addPage(page, 'About');
  const aboutUrl = page.url();
  await insertBlock(page, 'Call to action', 'Call to action, centered');
  await openPage(page, 'Home');
  await insertBlock(page, 'Headers', 'Hero, centered text');
  await linkHeroButtonTo(page, 'About');
  await markCanvasDocument(page);
  const canvas = page.frameLocator('.ve-canvas-frame');

  await canvas.locator('[data-field="primaryButton"]').click();
  await expectCurrentPage(page, 'Home');

  await page.getByRole('button', { name: 'Preview' }).click();
  await expect(page.locator('.ve-library')).toBeHidden();
  await canvas.locator('[data-field="primaryButton"]').click();
  await expect(page).toHaveURL(aboutUrl);
  await expect(canvas.locator('[data-component="cta-centered"]')).toBeVisible();
  expect(await isCanvasDocumentKept(page)).toBe(true);

  await page.keyboard.press('Escape');
  await expect(page.locator('.ve-library')).toBeVisible();
});
