import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import { createProject, insertBlock, readZip } from './editor';
import { bylinePack, hostilePack, invalidPack, validPack } from './fixtures/packs';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    Reflect.deleteProperty(window, 'showOpenFilePicker');
    Reflect.deleteProperty(window, 'showSaveFilePicker');
  });
});

function canvas(page: Page) {
  return page.frameLocator('.ve-canvas-frame');
}

async function choosePack(page: Page, pack: Promise<Buffer>): Promise<void> {
  const chooserPromise = page.waitForEvent('filechooser');
  await page.locator('.ve-blocks').getByRole('button', { name: 'Load block pack' }).click();
  const chooser = await chooserPromise;
  await chooser.setFiles({
    name: 'acme-blocks.zip',
    mimeType: 'application/zip',
    buffer: await pack,
  });
}

async function addPack(page: Page, pack: Promise<Buffer>, confirmLabel: string): Promise<void> {
  await choosePack(page, pack);
  const dialog = page.getByRole('dialog', { name: /Acme blocks/ });
  await dialog.getByRole('button', { name: confirmLabel }).click();
  await expect(dialog).toBeHidden();
}

function normalized(text: string | null): string {
  return (text ?? '').replace(/\s+/g, ' ').trim();
}

test('a valid pack previews at three widths and its blocks join the library', async ({ page }) => {
  await createProject(page);
  await choosePack(page, validPack());
  const dialog = page.getByRole('dialog', { name: 'Acme blocks 1.0.0' });
  await expect(dialog.locator('figcaption')).toHaveText([
    'Phone · 375 px',
    'Tablet · 768 px',
    'Desktop · 1440 px',
  ]);
  await expect(dialog.locator('iframe')).toHaveCount(3);
  await expect(
    dialog.frameLocator('iframe').first().locator('.b-acme-quote-card blockquote'),
  ).toHaveText('It changed how our team works.');
  await dialog.getByRole('button', { name: 'Add to library' }).click();
  await expect(page.locator('.ve-my-blocks')).toContainText('Acme blocks');

  await insertBlock(page, 'Testimonials', 'Quote card Custom');
  const block = canvas(page).locator('.b-acme-quote-card');
  await expect(block.locator('blockquote')).toHaveText('It changed how our team works.');
  const canvasText = normalized(await block.textContent());

  await page.getByRole('button', { name: 'Export', exact: true }).click();
  const exportDialog = page.getByRole('dialog', { name: 'Export site' });
  const downloadPromise = page.waitForEvent('download');
  await exportDialog.getByRole('button', { name: /Download zip|Export anyway/ }).click();
  const files = readZip(await readFile(await (await downloadPromise).path()));
  const html = files.get('index.html')?.toString('utf8') ?? '';
  const css = files.get('assets/css/site.css')?.toString('utf8') ?? '';
  expect(html).toContain('data-component="acme/quote-card"');
  expect(css).toContain('@scope (.b-acme-quote-card)');
  await page.setContent(html);
  expect(normalized(await page.locator('.b-acme-quote-card').textContent())).toBe(canvasText);
});

test('an invalid pack lists every problem with its block, field and line', async ({ page }) => {
  await createProject(page);
  await choosePack(page, invalidPack());
  const dialog = page.getByRole('dialog', { name: 'Acme blocks 1.0.0' });
  const note = dialog.getByRole('note');
  await expect(note).toContainText('This pack can’t be loaded');
  await expect(note).toContainText('acme/broken › template.hbs, line 2');
  await expect(note).toContainText('acme/broken › styles.css, line 3: !important is not allowed');
  await expect(dialog.getByRole('button', { name: 'Add to library' })).toHaveCount(0);
});

test('a pack’s CSS cannot reach the blocks around it', async ({ page }) => {
  await createProject(page);
  await addPack(page, hostilePack(), 'Add to library');
  await insertBlock(page, 'Testimonials', 'Hostile card Custom');
  await insertBlock(page, 'Headers', 'Hero, centered text');
  const red = 'rgb(255, 0, 0)';
  const hero = canvas(page).locator('.b-hero-centered');
  await expect(hero.locator('h1')).toBeVisible();
  expect(await hero.evaluate((element) => getComputedStyle(element).backgroundColor)).not.toBe(red);
  expect(await hero.locator('h1').evaluate((element) => getComputedStyle(element).color)).not.toBe(
    red,
  );
  expect(
    await canvas(page)
      .locator('body')
      .evaluate((element) => getComputedStyle(element).backgroundColor),
  ).not.toBe(red);
});

test('a project with custom blocks opens in a browser that does not have the pack', async ({
  page,
  browser,
}) => {
  await createProject(page);
  await addPack(page, validPack(), 'Add to library');
  await insertBlock(page, 'Testimonials', 'Quote card Custom');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: /^File/ }).click();
  await page.getByRole('menuitem', { name: 'Save to disk' }).click();
  const saved = await readFile(await (await downloadPromise).path(), 'utf8');

  const other = await browser.newPage();
  await other.addInitScript(() => Reflect.deleteProperty(window, 'showOpenFilePicker'));
  await other.goto('/');
  const chooserPromise = other.waitForEvent('filechooser');
  await other.getByRole('button', { name: 'Open from disk' }).click();
  await (
    await chooserPromise
  ).setFiles({
    name: 'site.json',
    mimeType: 'application/json',
    buffer: Buffer.from(saved),
  });
  await expect(
    other.frameLocator('.ve-canvas-frame').locator('.b-acme-quote-card blockquote'),
  ).toHaveText('It changed how our team works.');
  await expect(other.locator('.ve-toast')).toContainText('not in your library');
  await other.close();
});

test('updating a pack keeps content, drops removed fields and refuses older versions', async ({
  page,
}) => {
  await createProject(page);
  await addPack(page, validPack(), 'Add to library');
  await insertBlock(page, 'Testimonials', 'Quote card Custom');
  await page.locator('#ve-field-quote').fill('Edited before the update');
  await page.locator('#ve-field-author').fill('Ana Lima');
  await expect(canvas(page).locator('.b-acme-quote-card .b-author')).toHaveText('Ana Lima');

  await addPack(page, bylinePack(), 'Update to 1.1.0');
  const block = canvas(page).locator('.b-acme-quote-card');
  await expect(block.locator('blockquote')).toHaveText('Edited before the update');
  await expect(block.locator('.b-author')).toHaveText('A happy customer');
  await expect(
    page.locator('.ve-toast', { hasText: 'Removed “author” in Quote card on Home.' }),
  ).toBeVisible();

  await choosePack(page, validPack());
  const dialog = page.getByRole('dialog', { name: 'Acme blocks 1.0.0' });
  await expect(
    dialog.getByRole('button', { name: 'Your library has the newer 1.1.0' }),
  ).toBeDisabled();
});

test('custom blocks render under a Content Security Policy without unsafe-eval', async ({
  page,
}) => {
  await page.route('**/*', async (route) => {
    if (route.request().resourceType() !== 'document') return route.continue();
    const response = await route.fetch();
    await route.fulfill({
      response,
      headers: {
        ...response.headers(),
        'content-security-policy': "script-src 'self' 'unsafe-inline'",
      },
    });
  });
  const violations: string[] = [];
  page.on('console', (message) => {
    if (message.text().includes('Content Security Policy')) violations.push(message.text());
  });
  await createProject(page);
  await addPack(page, validPack(), 'Add to library');
  await insertBlock(page, 'Testimonials', 'Quote card Custom');
  await expect(canvas(page).locator('.b-acme-quote-card blockquote')).toHaveText(
    'It changed how our team works.',
  );
  expect(violations).toEqual([]);
});
