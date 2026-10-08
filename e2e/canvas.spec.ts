import { expect, test } from '@playwright/test';
import { boxOf, createProject, insertBlock, showBlockCategory } from './editor';

const CANVAS_PADDING_PX = 24;
const TOLERANCE_PX = 1;

test.beforeEach(async ({ page }) => {
  await createProject(page);
});

test('the desktop page fills the whole canvas area', async ({ page }) => {
  const canvas = await boxOf(page.locator('.ve-canvas'));
  const device = await boxOf(page.locator('.ve-canvas-device'));
  const frame = await boxOf(page.locator('.ve-canvas-frame'));
  expect(Math.abs(device.top - (canvas.top + CANVAS_PADDING_PX))).toBeLessThanOrEqual(TOLERANCE_PX);
  expect(Math.abs(device.bottom - (canvas.bottom - CANVAS_PADDING_PX))).toBeLessThanOrEqual(
    TOLERANCE_PX,
  );
  expect(Math.abs(frame.bottom - device.bottom)).toBeLessThanOrEqual(TOLERANCE_PX);
});

test('adding blocks below the fold scrolls the page, never the canvas around it', async ({
  page,
}) => {
  for (let count = 0; count < 4; count += 1) {
    await insertBlock(page, 'Content', 'Content, text and image');
  }
  const frameDocument = page.frameLocator('.ve-canvas-frame');
  await expect(frameDocument.locator('[data-block-id]')).toHaveCount(4);
  await expect
    .poll(() =>
      page.evaluate(() => document.querySelector('.ve-canvas-frame')?.getBoundingClientRect().top),
    )
    .toBe((await boxOf(page.locator('.ve-canvas-device'))).top);

  const scrollOffsets = await page.evaluate(() => {
    const iframe = document.querySelector<HTMLIFrameElement>('.ve-canvas-frame');
    return {
      device: document.querySelector('.ve-canvas-device')?.scrollTop,
      canvas: document.querySelector('.ve-canvas')?.scrollTop,
      page: iframe?.contentWindow?.scrollY ?? 0,
    };
  });
  expect(scrollOffsets.device).toBe(0);
  expect(scrollOffsets.canvas).toBe(0);
  expect(scrollOffsets.page).toBeGreaterThan(0);

  const lastBlockInView = await page.evaluate((tolerance) => {
    const iframe = document.querySelector<HTMLIFrameElement>('.ve-canvas-frame');
    const blocks = iframe?.contentDocument?.querySelectorAll('[data-block-id]');
    const last = blocks?.[blocks.length - 1]?.getBoundingClientRect();
    const viewportHeight = iframe?.contentWindow?.innerHeight ?? 0;
    return last !== undefined && last.top >= 0 && last.bottom <= viewportHeight + tolerance;
  }, TOLERANCE_PX);
  expect(lastBlockInView).toBe(true);

  const device = await boxOf(page.locator('.ve-canvas-device'));
  const frame = await boxOf(page.locator('.ve-canvas-frame'));
  expect(Math.abs(frame.bottom - device.bottom)).toBeLessThanOrEqual(TOLERANCE_PX);
});

test('phone and tablet previews keep the real screen proportions and fit the canvas', async ({
  page,
}) => {
  const screens = [
    { device: 'Phone (375 px)', ratio: 375 / 812 },
    { device: 'Tablet (768 px)', ratio: 768 / 1024 },
  ];
  for (const screen of screens) {
    await page.locator('label', { hasText: screen.device }).click();
    await expect
      .poll(async () => {
        const box = await boxOf(page.locator('.ve-canvas-device'));
        return Math.round(((box.right - box.left) / (box.bottom - box.top)) * 100) / 100;
      })
      .toBeCloseTo(screen.ratio, 2);
    const canvas = await boxOf(page.locator('.ve-canvas'));
    const device = await boxOf(page.locator('.ve-canvas-device'));
    expect(device.bottom).toBeLessThanOrEqual(canvas.bottom);
    expect(device.right).toBeLessThanOrEqual(canvas.right);
  }
});

test('double-clicking a heading edits it in place as one undo step', async ({ page }) => {
  await insertBlock(page, 'Headers', 'Hero, centered text');
  const heading = page.frameLocator('.ve-canvas-frame').locator('h1');
  const original = await heading.textContent();
  await heading.dblclick();
  await expect(heading).toHaveAttribute('contenteditable', 'plaintext-only');
  await page.keyboard.press('ControlOrMeta+A');
  await page.keyboard.type('Bread baked before sunrise');
  await expect(page.locator('#ve-field-title')).toHaveValue('Bread baked before sunrise');
  await page.keyboard.press('Enter');
  await expect(heading).not.toHaveAttribute('contenteditable');
  await expect(heading).toHaveText('Bread baked before sunrise');
  await page.keyboard.press('ControlOrMeta+Z');
  await expect(heading).toHaveText(original ?? '');
});

test('the Add block button inserts right after the selected block', async ({ page }) => {
  await insertBlock(page, 'Navigations', 'Navigation, logo left');
  await insertBlock(page, 'Footers', 'Footer, simple');
  const blocks = page.frameLocator('.ve-canvas-frame').locator('[data-component]');
  await blocks.first().click({ position: { x: 4, y: 4 } });
  await page.getByRole('button', { name: 'Add block' }).click();
  await showBlockCategory(page, 'Headers');
  await page.locator('.ve-library').getByRole('button', { name: 'Hero, centered text' }).click();
  await expect(blocks).toHaveCount(3);
  await expect(blocks.nth(1)).toHaveAttribute('data-component', 'hero-centered');
});
