import { readdir, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { chromium, type Page } from '@playwright/test';
import { createServer } from 'vite';

const ROOT = resolve(import.meta.dirname, '../../..');
const LIBRARY = join(ROOT, 'src/components/library');
const HARNESS_PATH = 'packages/block-thumbnails/harness.html';
const VIEWPORT = { width: 1440, height: 900 };
const THUMBNAIL = { width: 640, height: 400 };
const WEBP_QUALITY = 0.8;

async function componentFolders(): Promise<Map<string, string>> {
  const folders = new Map<string, string>();
  for (const entry of await readdir(LIBRARY, { withFileTypes: true })) {
    if (entry.isDirectory()) folders.set(entry.name, join(LIBRARY, entry.name));
  }
  return folders;
}

async function screenshotPng(page: Page, html: string): Promise<string> {
  await page.setContent(html, { waitUntil: 'load' });
  await page.evaluate(async () => {
    await document.fonts.ready;
    const images = [...document.images].map((image) => image.decode().catch(() => undefined));
    await Promise.all(images);
  });
  const png = await page.screenshot({ type: 'png' });
  return png.toString('base64');
}

async function toWebp(harness: Page, pngBase64: string): Promise<Buffer> {
  const webpBase64 = await harness.evaluate(
    async ({ png, size, quality }) => {
      const response = await fetch(`data:image/png;base64,${png}`);
      const bitmap = await createImageBitmap(await response.blob());
      const canvas = new OffscreenCanvas(size.width, size.height);
      const context = canvas.getContext('2d');
      if (context === null) throw new Error('No 2D canvas context');
      context.drawImage(bitmap, 0, 0, size.width, size.height);
      const webp = await canvas.convertToBlob({ type: 'image/webp', quality });
      const bytes = new Uint8Array(await webp.arrayBuffer());
      let binary = '';
      for (const byte of bytes) binary += String.fromCharCode(byte);
      return btoa(binary);
    },
    { png: pngBase64, size: THUMBNAIL, quality: WEBP_QUALITY },
  );
  return Buffer.from(webpBase64, 'base64');
}

async function openHarness(harness: Page, url: string): Promise<void> {
  await harness.goto(url);
  await harness.waitForFunction(() => window.thumbnailHarness !== undefined);
}

async function thumbnailFor(harness: Page, shotPage: Page, id: string): Promise<Buffer> {
  const html = await harness.evaluate(
    (componentId) => window.thumbnailHarness?.render(componentId) ?? '',
    id,
  );
  return toWebp(harness, await screenshotPng(shotPage, html));
}

async function generateThumbnails(onlyIds: string[]): Promise<void> {
  const server = await createServer({
    root: ROOT,
    server: { port: 0, watch: null },
    logLevel: 'warn',
  });
  await server.listen();
  const baseUrl = server.resolvedUrls?.local[0];
  if (baseUrl === undefined) throw new Error('The Vite server did not report a local URL');
  const browser = await chromium.launch();
  try {
    const harness = await browser.newPage();
    harness.on('pageerror', (error) => console.error('Harness error:', error.message));
    await openHarness(harness, `${baseUrl}${HARNESS_PATH}`);
    const ids = await harness.evaluate(() => window.thumbnailHarness?.ids() ?? []);
    const folders = await componentFolders();
    const shotPage = await browser.newPage({ viewport: VIEWPORT, deviceScaleFactor: 1 });
    for (const id of ids) {
      if (onlyIds.length > 0 && !onlyIds.includes(id)) continue;
      const folder = folders.get(id);
      if (folder === undefined) throw new Error(`No folder for component ${id}`);
      const webp = await thumbnailFor(harness, shotPage, id);
      await writeFile(join(folder, 'thumbnail.webp'), webp);
      await rm(join(folder, 'thumbnail.svg'), { force: true });
      console.log(`Wrote ${id} (${Math.round(webp.length / 1024)} KB)`);
    }
  } finally {
    await browser.close();
    await server.close();
  }
}

try {
  await generateThumbnails(process.argv.slice(2));
} catch (error) {
  console.error('Could not generate the block thumbnails', error);
  process.exitCode = 1;
}
