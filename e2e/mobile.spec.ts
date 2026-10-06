import { expect, test, type Page } from '@playwright/test';

const MIN_INPUT_FONT_SIZE_PX = 16;

async function tapTab(page: Page, name: string): Promise<void> {
  await page.locator('.ve-compact-tabs').getByRole('button', { name }).tap();
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

test('a site can be built on a phone, one view at a time', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'New project' }).tap();
  const tabs = page.locator('.ve-compact-tabs');
  await expect(tabs).toBeVisible();
  await expect(tabs.getByRole('button')).toHaveText(['Blocks', 'Layers', 'Canvas', 'Properties']);
  await expect(page.locator('.ve-canvas')).toBeVisible();
  await markCanvasDocument(page);

  await tapTab(page, 'Blocks');
  await expect(page.locator('.ve-library')).toBeVisible();
  await expect(page.locator('.ve-canvas')).toBeHidden();
  await page.locator('.ve-categories button', { hasText: 'Headers' }).tap();
  await page.getByRole('button', { name: 'Hero, centered text' }).tap();

  await expect(tabs.getByRole('button', { name: 'Canvas' })).toHaveAttribute(
    'aria-current',
    'page',
  );
  const canvas = page.frameLocator('.ve-canvas-frame');
  await expect(canvas.locator('.b-hero-centered')).toBeVisible();

  await page.getByRole('button', { name: 'Edit Hero, centered text' }).tap();
  const title = page.locator('[data-field-path="title"] input');
  await expect(title).toBeVisible();
  const fontSize = await title.evaluate((input) => parseFloat(getComputedStyle(input).fontSize));
  expect(fontSize).toBeGreaterThanOrEqual(MIN_INPUT_FONT_SIZE_PX);
  await title.fill('Built on a phone');

  await tapTab(page, 'Layers');
  await expect(page.locator('.ve-layer-name')).toHaveText(['Hero, centered text']);

  await tapTab(page, 'Canvas');
  await expect(canvas.locator('h1')).toHaveText('Built on a phone');
  expect(await isCanvasDocumentKept(page)).toBe(true);

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});

test('the home screen fits a phone screen', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'My projects' })).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});
