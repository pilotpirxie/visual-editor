import { expect, test, type Page } from '@playwright/test';
import { blockBoundaryOnScreen, boxOf, createProject, insertBlock, layerNames } from './editor';

const DROP_LINE_TOLERANCE_PX = 3;
const DRAG_STEPS = 12;

async function startDraggingCard(page: Page, category: string, blockName: string): Promise<void> {
  const library = page.locator('.ve-library');
  await library.locator('.ve-categories button', { hasText: category }).click();
  const cardButton = library.getByRole('button', { name: blockName });
  await cardButton.scrollIntoViewIfNeeded();
  const card = await boxOf(cardButton);
  await page.mouse.move((card.left + card.right) / 2, (card.top + card.bottom) / 2);
  await page.mouse.down();
}

test.beforeEach(async ({ page }) => {
  await createProject(page);
  await insertBlock(page, 'Navigations', 'Navigation, logo left');
  await insertBlock(page, 'Footers', 'Footer, simple');
});

test('a block dragged from the library lands exactly where the line shows', async ({ page }) => {
  const boundary = await blockBoundaryOnScreen(page, 0);
  const device = await boxOf(page.locator('.ve-canvas-device'));
  const centerX = (device.left + device.right) / 2;

  await startDraggingCard(page, 'Content', 'Content, text and image');
  await page.mouse.move(centerX, boundary, { steps: DRAG_STEPS });
  const line = page.locator('.ve-drop-line');
  await expect(line).toBeVisible();
  const lineBox = await boxOf(line);
  const lineCenter = (lineBox.top + lineBox.bottom) / 2;
  expect(Math.abs(lineCenter - boundary)).toBeLessThanOrEqual(DROP_LINE_TOLERANCE_PX);
  await page.mouse.up();

  expect(await layerNames(page)).toEqual([
    'Navigation, logo left',
    'Content, text and image',
    'Footer, simple',
  ]);
});

test('Escape cancels a drag without adding anything', async ({ page }) => {
  const device = await boxOf(page.locator('.ve-canvas-device'));
  await startDraggingCard(page, 'Content', 'Content, text and image');
  await page.mouse.move((device.left + device.right) / 2, device.top + 20, { steps: DRAG_STEPS });
  await expect(page.locator('.ve-drop-line')).toBeVisible();
  await page.keyboard.press('Escape');
  await page.mouse.up();
  await expect(page.locator('.ve-drop-line')).toHaveCount(0);
  expect(await layerNames(page)).toEqual(['Navigation, logo left', 'Footer, simple']);
});

test('a selected block can be dragged by its handle to a new position', async ({ page }) => {
  await page
    .frameLocator('.ve-canvas-frame')
    .locator('[data-block-id]')
    .first()
    .click({
      position: { x: 10, y: 10 },
    });
  const handle = await boxOf(page.getByRole('button', { name: 'Drag to move' }));
  const device = await boxOf(page.locator('.ve-canvas-device'));
  const belowFooter = (await blockBoundaryOnScreen(page, 1)) - 2;

  await page.mouse.move((handle.left + handle.right) / 2, (handle.top + handle.bottom) / 2);
  await page.mouse.down();
  await page.mouse.move((device.left + device.right) / 2, belowFooter, { steps: DRAG_STEPS });
  await expect(page.locator('.ve-drop-line')).toBeVisible();
  await page.mouse.up();

  expect(await layerNames(page)).toEqual(['Footer, simple', 'Navigation, logo left']);
});

test('the Layers list reorders blocks by dragging rows', async ({ page }) => {
  await page.locator('.ve-library [role="tab"]', { hasText: 'Layers' }).click();
  const rows = page.locator('.ve-layer');
  const first = await boxOf(rows.nth(0));
  const second = await boxOf(rows.nth(1));
  await page.mouse.move(first.left + 40, (first.top + first.bottom) / 2);
  await page.mouse.down();
  await page.mouse.move(second.left + 40, second.bottom - 2, { steps: DRAG_STEPS });
  await page.mouse.up();
  await expect(page.locator('.ve-layer-name')).toHaveText([
    'Footer, simple',
    'Navigation, logo left',
  ]);
});
