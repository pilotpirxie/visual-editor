import { inflateRawSync } from 'node:zlib';
import { expect, type Locator, type Page } from '@playwright/test';

export type Box = { top: number; bottom: number; left: number; right: number };

export async function createProject(page: Page): Promise<void> {
  await page.goto('/');
  await page.getByRole('button', { name: 'New project' }).click();
  await page.getByRole('button', { name: 'Start with Clean' }).click();
  await expect(page.locator('.ve-toolbar')).toBeVisible();
  await expect(page.frameLocator('.ve-canvas-frame').locator('#ve-page')).toBeAttached();
}

export async function waitForStoredText(page: Page, text: string): Promise<void> {
  await expect.poll(async () => JSON.stringify(await storedProject(page))).toContain(text);
}

export type LibraryTab = 'Blocks' | 'Layers' | 'Pages';

export type StoredProject = {
  settings: { title: string; baseUrl?: string };
  pages: { ids: string[]; entities: Record<string, { name: string; blockIds: string[] }> };
  blocks: { entities: Record<string, { values?: Record<string, unknown> }> };
};

export async function openLibraryTab(page: Page, name: LibraryTab): Promise<void> {
  const tab = page.locator('.ve-library [role="tab"]', { hasText: name });
  const isShown = (await page.locator('.ve-library[data-open]').count()) > 0;
  const isSelected = (await tab.getAttribute('aria-selected')) === 'true';
  if (isShown && isSelected) return;
  await tab.click();
}

export async function closeLibraryDrawer(page: Page): Promise<void> {
  if ((await page.locator('.ve-shell[data-library-drawer]').count()) === 0) return;
  await page.locator('.ve-library [role="tab"][aria-selected="true"]').focus();
  await page.keyboard.press('Escape');
  await expect(page.locator('.ve-shell[data-library-drawer]')).toHaveCount(0);
}

export async function showAllBlockCategories(page: Page): Promise<void> {
  const library = page.locator('.ve-library');
  if (await library.locator('[role="tab"]').first().isVisible()) {
    await openLibraryTab(page, 'Blocks');
  }
  const allCategories = library.getByRole('button', { name: 'All categories' });
  if (await allCategories.isVisible()) await allCategories.click();
}

export async function showBlockCategory(page: Page, category: string): Promise<void> {
  await showAllBlockCategories(page);
  await page.locator('.ve-library .ve-categories button', { hasText: category }).click();
}

function pageRowButton(page: Page, name: string): Locator {
  return page
    .locator('.ve-page-name')
    .filter({ has: page.locator('span', { hasText: new RegExp(`^${name}$`) }) });
}

export async function expectCurrentPage(page: Page, name: string): Promise<void> {
  await openLibraryTab(page, 'Pages');
  await expect(pageRowButton(page, name)).toHaveAttribute('aria-current', 'page');
  await closeLibraryDrawer(page);
}

export async function addPage(page: Page, name: string): Promise<void> {
  await openLibraryTab(page, 'Pages');
  await page.locator('.ve-pages').getByRole('button', { name: 'Add page' }).click();
  const dialog = page.getByRole('dialog', { name: 'Add page' });
  await dialog.getByLabel('Name').fill(name);
  await dialog.getByRole('button', { name: 'Add page' }).click();
  await expectCurrentPage(page, name);
}

export async function openPage(page: Page, name: string): Promise<void> {
  await openLibraryTab(page, 'Pages');
  await pageRowButton(page, name).click();
  await expect(pageRowButton(page, name)).toHaveAttribute('aria-current', 'page');
}

export async function openProjectSettings(page: Page): Promise<Locator> {
  await page.getByRole('button', { name: /^File/ }).click();
  await page.getByRole('menuitem', { name: 'Project settings' }).click();
  return page.getByRole('tabpanel', { name: 'Settings' });
}

export function storedProject(page: Page): Promise<StoredProject | null> {
  return page.evaluate(async () => {
    const projectId = window.location.pathname.split('/')[2] ?? '';
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('visual-editor');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    try {
      return await new Promise<StoredProject | null>((resolve, reject) => {
        const request = db.transaction('documents').objectStore('documents').get(projectId);
        request.onsuccess = () => resolve(request.result ?? null);
        request.onerror = () => reject(request.error);
      });
    } finally {
      db.close();
    }
  });
}

export async function insertBlock(page: Page, category: string, blockName: string): Promise<void> {
  await showBlockCategory(page, category);
  await page.locator('.ve-library').getByRole('button', { name: blockName }).click();
  await closeLibraryDrawer(page);
}

export async function layerNames(page: Page): Promise<string[]> {
  await openLibraryTab(page, 'Layers');
  const names = await page.locator('.ve-layer-name').allTextContents();
  await closeLibraryDrawer(page);
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

export function readZip(buffer: Buffer): Map<string, Buffer> {
  const files = new Map<string, Buffer>();
  let offset = 0;
  while (buffer.readUInt32LE(offset) === 0x04034b50) {
    const method = buffer.readUInt16LE(offset + 8);
    const compressedSize = buffer.readUInt32LE(offset + 18);
    const nameLength = buffer.readUInt16LE(offset + 26);
    const name = buffer.toString('utf8', offset + 30, offset + 30 + nameLength);
    const start = offset + 30 + nameLength;
    const body = buffer.subarray(start, start + compressedSize);
    files.set(name, method === 8 ? inflateRawSync(body) : Buffer.from(body));
    offset = start + compressedSize;
  }
  return files;
}

export async function insertEveryBlock(page: Page): Promise<number> {
  const library = page.locator('.ve-library');
  await openLibraryTab(page, 'Blocks');
  const categories = await library.locator('.ve-categories button').allTextContents();
  let count = 0;
  for (const category of categories) {
    await showBlockCategory(page, category);
    const total = await library.locator('.ve-component-card').count();
    for (let card = 0; card < total; card += 1) {
      await showBlockCategory(page, category);
      await library.locator('.ve-component-card').nth(card).click();
      count += 1;
    }
  }
  await closeLibraryDrawer(page);
  return count;
}
