import { expect, type Locator, type Page } from '@playwright/test';

export type Box = { top: number; bottom: number; left: number; right: number };

export async function createProject(page: Page): Promise<void> {
  await page.goto('/');
  await page.getByRole('button', { name: 'New project' }).click();
  await expect(page.locator('.ve-toolbar')).toBeVisible();
  await expect(page.frameLocator('.ve-canvas-frame').locator('#ve-page')).toBeAttached();
}

export async function insertBlock(page: Page, category: string, blockName: string): Promise<void> {
  const library = page.locator('.ve-library');
  await library.locator('.ve-categories button', { hasText: category }).click();
  await library.getByRole('button', { name: blockName }).click();
  await library.getByRole('button', { name: 'All categories' }).click();
}

export async function layerNames(page: Page): Promise<string[]> {
  await page.locator('.ve-library [role="tab"]', { hasText: 'Layers' }).click();
  const names = await page.locator('.ve-layer-name').allTextContents();
  await page.locator('.ve-library [role="tab"]', { hasText: 'Blocks' }).click();
  return names;
}

export async function boxOf(locator: Locator): Promise<Box> {
  const box = await locator.boundingBox();
  if (box === null) throw new Error('The element is not visible');
  return { top: box.y, bottom: box.y + box.height, left: box.x, right: box.x + box.width };
}

export async function blockBoundaryOnScreen(page: Page, index: number): Promise<number> {
  return page.evaluate((blockIndex) => {
    const iframe = document.querySelector<HTMLIFrameElement>('.ve-canvas-frame');
    const blocks = iframe?.contentDocument?.querySelectorAll('[data-block-id]');
    if (!iframe || !blocks) throw new Error('The canvas is not ready');
    const frameBox = iframe.getBoundingClientRect();
    const scale = frameBox.height / iframe.offsetHeight;
    const block = blocks[blockIndex].getBoundingClientRect();
    return frameBox.top + block.bottom * scale;
  }, index);
}
