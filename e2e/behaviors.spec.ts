import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { expect, test, type FrameLocator, type Page } from '@playwright/test';
import { createProject, insertBlock, readZip } from './editor';

type Scope = Page | FrameLocator;

async function addInteractiveBlocks(page: Page): Promise<void> {
  await createProject(page);
  await insertBlock(page, 'Navigations', 'Navigation, with dropdown menus');
  await insertBlock(page, 'Features', 'Features, tabs');
  await insertBlock(page, 'Pricing', 'Pricing, monthly or yearly');
  await insertBlock(page, 'Testimonials', 'Testimonials, carousel');
  await insertBlock(page, 'Numbers', 'Numbers, stats row');
}

async function expectBehaviorsWork(scope: Scope, page: Page): Promise<void> {
  const tabs = scope.getByRole('tab');
  await expect(tabs).toHaveCount(3);
  await tabs.nth(2).click();
  await expect(scope.getByRole('tabpanel')).toContainText('Clips your whole team');
  await tabs.first().focus();
  await page.keyboard.press('ArrowRight');
  await expect(scope.getByRole('tab', { name: 'Tag' })).toHaveAttribute('aria-selected', 'true');
  await expect(scope.getByRole('tabpanel')).toContainText('Themes that build themselves');
  await page.keyboard.press('End');
  await expect(scope.getByRole('tabpanel')).toContainText('Clips your whole team');

  const pricing = scope.locator('.b-pricing-toggle');
  await expect(pricing.getByText('$23').first()).toBeHidden();
  await pricing.getByRole('radio', { name: /Yearly/ }).check();
  await expect(pricing.getByText('$23').first()).toBeVisible();
  await expect(pricing.getByText('$29').first()).toBeHidden();

  const carousel = scope.locator('.b-testimonials-carousel');
  await carousel.getByRole('button', { name: 'Next quote' }).click();
  await expect(carousel.getByRole('button', { name: 'Quote 2 of 4' })).toHaveAttribute(
    'aria-current',
    'true',
  );
  await expect(carousel.getByRole('button', { name: 'Previous quote' })).toBeEnabled();

  await expect(scope.locator('.b-stats-row .b-value').first()).toHaveText('12,000+');

  const product = scope.getByRole('button', { name: 'Product' });
  await product.click();
  await expect(product).toHaveAttribute('aria-expanded', 'true');
  await expect(scope.getByRole('link', { name: 'Theme board' })).toBeVisible();
  await scope.getByRole('link', { name: 'Theme board' }).focus();
  await page.keyboard.press('Escape');
  await expect(product).toHaveAttribute('aria-expanded', 'false');
  await product.focus();
  await page.keyboard.press('ArrowDown');
  await expect(scope.getByRole('link', { name: 'Interview recorder' })).toBeFocused();
}

test('tabs, pricing toggle, carousel, numbers and dropdowns work in Preview', async ({ page }) => {
  await addInteractiveBlocks(page);
  await page.locator('label', { hasText: 'Desktop (1440 px)' }).click();
  await page.getByRole('button', { name: 'Preview', exact: true }).click();
  await expectBehaviorsWork(page.frameLocator('.ve-canvas-frame'), page);
});

test('the same blocks work in the exported site opened from disk', async ({ page }, testInfo) => {
  await addInteractiveBlocks(page);
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  const downloadPromise = page.waitForEvent('download');
  await page
    .getByRole('dialog', { name: 'Export site' })
    .getByRole('button', { name: /Download zip|Export anyway/ })
    .click();
  const files = readZip(await readFile(await (await downloadPromise).path()));
  const siteJs = files.get('assets/js/site.js')?.toString('utf8') ?? '';
  for (const name of ['menu', 'dropdown', 'tabs', 'carousel', 'counter']) {
    expect(siteJs).toContain(`name: "${name}"`);
  }
  const folder = testInfo.outputPath('site');
  for (const [path, content] of files) {
    const target = join(folder, path);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, content);
  }
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning') errors.push(message.text());
  });
  await page.goto(pathToFileURL(join(folder, 'index.html')).href);
  await expectBehaviorsWork(page, page);
  expect(errors).toEqual([]);
});
