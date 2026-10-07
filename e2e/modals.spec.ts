import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { addPage, createProject, insertBlock, openPage, readZip } from './editor';

function canvas(page: Page) {
  return page.frameLocator('.ve-canvas-frame');
}

async function linkCtaToModal(page: Page): Promise<void> {
  await insertBlock(page, 'Modals', 'Modal, simple dialog');
  await insertBlock(page, 'Call to action', 'Call to action, centered');
  const button = page.locator('.ve-properties fieldset', { hasText: 'Button' }).first();
  await button.getByLabel('Web address').fill('#modal');
}

async function exportToFolder(page: Page, testInfo: TestInfo): Promise<Map<string, Buffer>> {
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Export site' });
  const downloadPromise = page.waitForEvent('download');
  await dialog.getByRole('button', { name: /Download zip|Export anyway/ }).click();
  const files = readZip(await readFile(await (await downloadPromise).path()));
  const folder = testInfo.outputPath('site');
  for (const [path, content] of files) {
    const target = join(folder, path);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, content);
  }
  return files;
}

function sitePage(testInfo: TestInfo, fileName: string): string {
  return pathToFileURL(join(testInfo.outputPath('site'), fileName)).href;
}

test('a modal shows inline while editing and opens from a link in Preview', async ({ page }) => {
  await createProject(page);
  await linkCtaToModal(page);
  const dialog = canvas(page).locator('.b-modal-simple dialog');
  await expect(dialog).toBeVisible();
  await expect(page.locator('.ve-outline-note', { hasText: 'Modal' })).toBeVisible();

  await page.getByRole('button', { name: 'Preview', exact: true }).click();
  await expect(dialog).toBeHidden();
  await canvas(page).locator('.b-cta-centered .btn').first().click();
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveAttribute('open', '');
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
});

test('the exported modal opens from its link and closes on the backdrop', async ({
  page,
}, testInfo) => {
  await createProject(page);
  await linkCtaToModal(page);
  const files = await exportToFolder(page, testInfo);
  expect(files.get('assets/js/site.js')?.toString('utf8')).toContain('name: "modal"');

  const problems: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning') problems.push(message.text());
  });
  await page.goto(sitePage(testInfo, 'index.html'));
  const dialog = page.locator('.b-modal-simple dialog');
  await expect(dialog).toBeHidden();
  await page.locator('.b-cta-centered .btn').first().click();
  await expect(dialog).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.style.overflow)).toBe('hidden');
  await page.mouse.click(5, 5);
  await expect(dialog).toBeHidden();
  await expect.poll(() => page.evaluate(() => document.documentElement.style.overflow)).toBe('');
  expect(problems).toEqual([]);
});

test('a shared cookie bar shows on every page and remembers the choice', async ({
  page,
}, testInfo) => {
  await createProject(page);
  await insertBlock(page, 'Cookies', 'Cookies, bottom bar');
  await page.getByRole('switch', { name: 'Shared on all pages' }).check();
  await addPage(page, 'About');
  await expect(canvas(page).locator('.b-cookie-bar')).toBeVisible();
  await openPage(page, 'Home');

  const files = await exportToFolder(page, testInfo);
  expect(files.has('about.html')).toBe(true);
  await page.goto(sitePage(testInfo, 'index.html'));
  const banner = page.locator('.b-cookie-bar dialog');
  await expect(banner).toBeVisible();
  await banner.getByRole('button', { name: 'Accept' }).click();
  await expect(banner).toBeHidden();
  await page.reload();
  await expect(page.locator('.b-cookie-bar dialog')).toBeHidden();
});

test('a page named 404 exports as 404.html with the 404 block', async ({ page }, testInfo) => {
  await createProject(page);
  await addPage(page, '404');
  await insertBlock(page, 'HTTP codes', 'HTTP code, 404 not found');
  const files = await exportToFolder(page, testInfo);
  const html = files.get('404.html')?.toString('utf8') ?? '';
  expect(html).toContain('<h1>We can’t find that page</h1>');
});
