import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { expect, test } from '@playwright/test';
import { createProject, insertEveryBlock, readZip } from './editor';

const WIDTHS = [320, 375, 768, 1024, 1440];

test('every block fits from 320 to 1440 pixels wide in the exported site', async ({
  page,
}, testInfo) => {
  test.setTimeout(300_000);
  await createProject(page);
  const count = await insertEveryBlock(page);
  expect(count).toBeGreaterThanOrEqual(75);
  await expect(page.frameLocator('.ve-canvas-frame').locator('[data-block-id]')).toHaveCount(count);

  await page.getByRole('button', { name: 'Export', exact: true }).click();
  const downloadPromise = page.waitForEvent('download');
  await page
    .getByRole('dialog', { name: 'Export site' })
    .getByRole('button', { name: 'Download zip' })
    .click();
  const files = readZip(await readFile(await (await downloadPromise).path()));
  expect(files.get('index.html')?.toString('utf8')).toContain(
    '<symbol id="icon-simple-icons-github"',
  );
  const folder = testInfo.outputPath('site');
  for (const [path, content] of files) {
    const target = join(folder, path);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, content);
  }

  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await page.goto(pathToFileURL(join(folder, 'index.html')).href);
  for (const width of WIDTHS) {
    await page.setViewportSize({ width, height: 900 });
    const overflow = await page.evaluate(() => {
      const wide: string[] = [];
      const limit = document.documentElement.clientWidth + 1;
      for (const block of document.querySelectorAll('[data-component]')) {
        if (block.scrollWidth <= limit) continue;
        const parts: string[] = [];
        for (const element of block.querySelectorAll('*')) {
          const box = element.getBoundingClientRect();
          if (box.right > limit) parts.push(`${element.localName} ${Math.round(box.right)}`);
        }
        wide.push(`${block.getAttribute('data-component')}: ${parts.slice(0, 3).join(', ')}`);
      }
      return { pageWidth: document.documentElement.scrollWidth, viewport: window.innerWidth, wide };
    });
    expect(overflow.wide, `blocks wider than ${width}px`).toEqual([]);
    expect(overflow.pageWidth, `page at ${width}px`).toBeLessThanOrEqual(overflow.viewport);
  }
  expect(errors).toEqual([]);
});
