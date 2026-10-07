import { expect, test } from '@playwright/test';
import { boxOf, createProject, insertBlock } from './editor';

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

  const lastBlockInView = await page.evaluate(() => {
    const iframe = document.querySelector<HTMLIFrameElement>('.ve-canvas-frame');
    const blocks = iframe?.contentDocument?.querySelectorAll('[data-block-id]');
    const last = blocks?.[blocks.length - 1]?.getBoundingClientRect();
    const viewportHeight = iframe?.contentWindow?.innerHeight ?? 0;
    return last !== undefined && last.top >= 0 && last.bottom <= viewportHeight;
  });
  expect(lastBlockInView).toBe(true);

  const device = await boxOf(page.locator('.ve-canvas-device'));
  const frame = await boxOf(page.locator('.ve-canvas-frame'));
  expect(Math.abs(frame.bottom - device.bottom)).toBeLessThanOrEqual(TOLERANCE_PX);
});

test('phone and tablet previews keep the real screen proportions and fit the canvas', async ({
  page,
}) => {
  const screens = [
    { device: 'phone', ratio: 375 / 812 },
    { device: 'tablet', ratio: 768 / 1024 },
  ];
  for (const screen of screens) {
    await page.getByRole('combobox', { name: 'Device' }).selectOption(screen.device);
    const canvas = await boxOf(page.locator('.ve-canvas'));
    const device = await boxOf(page.locator('.ve-canvas-device'));
    const ratio = (device.right - device.left) / (device.bottom - device.top);
    expect(ratio).toBeCloseTo(screen.ratio, 2);
    expect(device.bottom).toBeLessThanOrEqual(canvas.bottom);
    expect(device.right).toBeLessThanOrEqual(canvas.right);
  }
});
