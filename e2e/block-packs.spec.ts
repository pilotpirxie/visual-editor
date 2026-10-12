import { readFile } from 'node:fs/promises';
import { expect, test, type Page, type FrameLocator, type Locator } from '@playwright/test';
import {
  createProject,
  insertBlock,
  readZip,
  showAllBlockCategories,
  exportedFiles,
} from './editor';
import {
  animatedPack,
  bylinePack,
  hostilePack,
  invalidPack,
  nestedKeyframesPack,
  validPack,
} from './fixtures/packs';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    Reflect.deleteProperty(window, 'showOpenFilePicker');
    Reflect.deleteProperty(window, 'showSaveFilePicker');
  });
});

function canvas(page: Page): FrameLocator {
  return page.frameLocator('.ve-canvas-frame');
}

async function choosePack(page: Page, pack: Promise<Buffer>): Promise<void> {
  await showAllBlockCategories(page);
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

async function openManagePacks(page: Page): Promise<Locator> {
  await showAllBlockCategories(page);
  await page.locator('.ve-blocks').getByRole('button', { name: 'Manage packs' }).click();
  return page.getByRole('dialog', { name: 'Block packs' });
}

async function saveToDisk(page: Page): Promise<string> {
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: /^File/ }).click();
  await page.getByRole('menuitem', { name: 'Save to disk' }).click();
  return readFile(await (await downloadPromise).path(), 'utf8');
}

async function openFromDisk(page: Page, saved: string): Promise<void> {
  await page.addInitScript(() => Reflect.deleteProperty(window, 'showOpenFilePicker'));
  await page.goto('/');
  const chooserPromise = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Open from disk' }).click();
  const chooser = await chooserPromise;
  await chooser.setFiles({
    name: 'site.json',
    mimeType: 'application/json',
    buffer: Buffer.from(saved),
  });
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

  const files = await exportedFiles(page);
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

test('a pack block animates with keyframes named after it, on the canvas and in the export', async ({
  page,
}) => {
  await createProject(page);
  await addPack(page, animatedPack(), 'Add to library');
  await insertBlock(page, 'Testimonials', 'Quote card Custom');
  const quote = canvas(page).locator('.b-acme-quote-card .b-quote');
  await expect(quote).toHaveCSS('animation-name', 'b-acme-quote-card--glow');
  const keyframeNames = await canvas(page)
    .locator('html')
    .evaluate(() => {
      const names: string[] = [];
      function collect(rules: CSSRuleList): void {
        for (const rule of rules) {
          if (rule instanceof CSSKeyframesRule) names.push(rule.name);
          else if ('cssRules' in rule && rule.cssRules instanceof CSSRuleList)
            collect(rule.cssRules);
        }
      }
      for (const sheet of document.styleSheets) {
        if (sheet.href === null) collect(sheet.cssRules);
      }
      return names;
    });
  expect(keyframeNames).toContain('b-acme-quote-card--glow');

  const files = await exportedFiles(page);
  const css = files.get('assets/css/site.css')?.toString('utf8') ?? '';
  expect(css).toContain('@keyframes b-acme-quote-card--glow');
  expect(css).toContain('animation-iteration-count: 1 !important');
});

test('keyframes written inside the scope are refused with the reason', async ({ page }) => {
  await createProject(page);
  await choosePack(page, nestedKeyframesPack());
  const dialog = page.getByRole('dialog', { name: 'Acme blocks 1.0.0' });
  await expect(dialog.getByRole('note')).toContainText('@keyframes');
  await expect(dialog.getByRole('button', { name: 'Add to library' })).toHaveCount(0);
});

test('removing a pack deletes its blocks from the project and undo brings them back', async ({
  page,
}) => {
  await createProject(page);
  await addPack(page, validPack(), 'Add to library');
  await insertBlock(page, 'Testimonials', 'Quote card Custom');
  const block = canvas(page).locator('.b-acme-quote-card');
  await expect(block).toHaveCount(1);

  const dialog = await openManagePacks(page);
  const row = dialog.locator('.ve-pack-row', { hasText: 'Acme blocks' });
  await row.getByRole('button', { name: 'Remove' }).click();
  await expect(row.locator('.ve-pack-removal')).toHaveText(
    'Deletes 1 block from this project: Home (1). Undo brings the blocks back. Other projects keep their saved copy.',
  );
  await row.getByRole('button', { name: 'Remove pack and its blocks' }).click();
  await expect(block).toHaveCount(0);
  await expect(dialog.locator('.ve-pack-row')).toHaveCount(0);
  await dialog.getByRole('button', { name: 'Done' }).click();
  await expect(page.locator('.ve-blocks')).not.toContainText('Acme blocks');

  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(block.locator('blockquote')).toHaveText('It changed how our team works.');
  const reopened = await openManagePacks(page);
  const missing = reopened.locator('.ve-pack-row', { hasText: 'Acme blocks' });
  await expect(missing.getByRole('button', { name: 'Add to library' })).toBeVisible();
  await missing.getByRole('button', { name: 'Remove' }).click();
  await missing.getByRole('button', { name: 'Remove from project' }).click();
  await expect(block).toHaveCount(0);
  await expect(reopened.locator('.ve-pack-row')).toHaveCount(0);
});

test('a project whose pack is gone without a saved copy opens with a placeholder and exports without it', async ({
  page,
  browser,
}) => {
  await createProject(page);
  await insertBlock(page, 'Headers', 'Hero, centered text');
  await addPack(page, validPack(), 'Add to library');
  await insertBlock(page, 'Testimonials', 'Quote card Custom');
  const saved: { packBlocks: unknown } = JSON.parse(await saveToDisk(page));
  saved.packBlocks = {};

  const other = await browser.newPage();
  await openFromDisk(other, JSON.stringify(saved));
  const frame = other.frameLocator('.ve-canvas-frame');
  await expect(frame.locator('h1')).toBeVisible();
  await expect(frame.locator('body')).toContainText('Missing component: acme/quote-card');

  await other.getByRole('button', { name: 'Export', exact: true }).click();
  const exportDialog = other.getByRole('dialog', { name: 'Export site' });
  await expect(exportDialog).toContainText(
    'A block needs the missing component “acme/quote-card” and is left out.',
  );
  const downloadPromise = other.waitForEvent('download');
  await exportDialog.getByRole('button', { name: /Download zip|Export anyway/ }).click();
  const files = readZip(await readFile(await (await downloadPromise).path()));
  const html = files.get('index.html')?.toString('utf8') ?? '';
  expect(html).toContain('b-hero-centered');
  expect(html).not.toContain('acme');
  await other.close();
});
