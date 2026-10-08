import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { expect, test, type Page } from '@playwright/test';
import { createProject, storedProject } from '../editor';

const CPU_SLOWDOWN = 4;
const READY_BUDGET_MS = 3000;
const FIELD_EDIT_BUDGET_MS = 100;
const TOKEN_CHANGE_BUDGET_MS = 200;
const EXPORT_BUDGET_MS = 5000;
const MAIN_CHUNK_BUDGET = 300 * 1024;
const BLOCK_COUNT = 30;
const EDIT_SAMPLES = 20;
const PERCENTILE_95 = 0.95;

async function slowDownCpu(page: Page): Promise<void> {
  const session = await page.context().newCDPSession(page);
  await session.send('Emulation.setCPUThrottlingRate', { rate: CPU_SLOWDOWN });
}

async function insertBlocks(page: Page, count: number): Promise<void> {
  const library = page.locator('.ve-library');
  let inserted = 0;
  const categoryCount = await library.locator('.ve-categories button').count();
  for (let category = 0; category < categoryCount && inserted < count; category += 1) {
    await library.locator('.ve-categories button').nth(category).click();
    const cards = library.locator('.ve-component-card');
    const total = await cards.count();
    for (let card = 0; card < total && inserted < count; card += 1) {
      await cards.nth(card).click();
      inserted += 1;
    }
    await library.getByRole('button', { name: 'All categories' }).click();
  }
}

async function waitForSave(page: Page, blockCount: number): Promise<void> {
  await expect
    .poll(async () => Object.keys((await storedProject(page))?.blocks.entities ?? {}).length)
    .toBe(blockCount);
}

function percentile(samples: number[], fraction: number): number {
  const sorted = [...samples].sort((left, right) => left - right);
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * fraction))] ?? 0;
}

test('the editor is ready in under 3 seconds', async ({ page }) => {
  await createProject(page);
  await insertBlocks(page, BLOCK_COUNT);
  await waitForSave(page, BLOCK_COUNT);
  await slowDownCpu(page);
  const startedAt = Date.now();
  await page.reload();
  await expect(page.locator('.ve-toolbar')).toBeVisible();
  await expect(page.frameLocator('.ve-canvas-frame').locator('[data-block-id]')).toHaveCount(
    BLOCK_COUNT,
  );
  const elapsed = Date.now() - startedAt;
  console.log(`Editor ready in ${elapsed} ms`);
  expect(elapsed).toBeLessThan(READY_BUDGET_MS);
});

test('a field edit reaches the canvas in under 100 ms on a 30-block page', async ({ page }) => {
  await createProject(page);
  await insertBlocks(page, BLOCK_COUNT);
  await page.frameLocator('.ve-canvas-frame').locator('[data-component="hero-centered"]').click();
  await expect(page.locator('#ve-field-title')).toBeVisible();
  await slowDownCpu(page);
  const samples = await page.evaluate(async (count) => {
    const input = document.querySelector<HTMLTextAreaElement>('#ve-field-title');
    const frame = document.querySelector<HTMLIFrameElement>('.ve-canvas-frame');
    const heading = frame?.contentDocument?.querySelector('[data-component="hero-centered"] h1');
    const setValue = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
    if (input === null || heading === null || heading === undefined || setValue === undefined) {
      throw new Error('The hero title field or heading is missing');
    }
    const timings: number[] = [];
    for (let index = 0; index < count; index += 1) {
      const changed = new Promise<void>((resolve) => {
        const observer = new MutationObserver(() => {
          observer.disconnect();
          requestAnimationFrame(() => resolve());
        });
        observer.observe(heading, { childList: true, characterData: true, subtree: true });
      });
      const startedAt = performance.now();
      setValue.call(input, `Customer research, take ${index}`);
      input.dispatchEvent(new Event('input', { bubbles: true }));
      await changed;
      timings.push(performance.now() - startedAt);
    }
    return timings;
  }, EDIT_SAMPLES);
  const p95 = percentile(samples, PERCENTILE_95);
  console.log(`Field edit to canvas p95 ${p95.toFixed(1)} ms`);
  expect(p95).toBeLessThan(FIELD_EDIT_BUDGET_MS);
});

test('a design token change reaches the canvas in under 200 ms', async ({ page }) => {
  await createProject(page);
  await insertBlocks(page, BLOCK_COUNT);
  await page.getByRole('button', { name: 'Design system' }).click();
  await expect(page.getByLabel('Primary: pick a color')).toBeAttached();
  await slowDownCpu(page);
  const elapsed = await page.evaluate(async () => {
    const input = document.querySelector<HTMLInputElement>('[aria-label="Primary: pick a color"]');
    const frame = document.querySelector<HTMLIFrameElement>('.ve-canvas-frame');
    const button = frame?.contentDocument?.querySelector('.btn-primary');
    const view = frame?.contentWindow;
    const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
    if (
      input === null ||
      button === null ||
      button === undefined ||
      view === null ||
      view === undefined ||
      setValue === undefined
    ) {
      throw new Error('The primary color field or a primary button is missing');
    }
    const before = view.getComputedStyle(button).backgroundColor;
    const startedAt = performance.now();
    setValue.call(input, '#0f766e');
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise<void>((resolve) => {
      function check(): void {
        if (view?.getComputedStyle(button as Element).backgroundColor !== before) {
          resolve();
          return;
        }
        requestAnimationFrame(check);
      }
      check();
    });
    return performance.now() - startedAt;
  });
  console.log(`Token change to canvas ${elapsed.toFixed(1)} ms`);
  expect(elapsed).toBeLessThan(TOKEN_CHANGE_BUDGET_MS);
});

test('a 10-page site exports in under 5 seconds', async ({ page }) => {
  await createProject(page);
  await insertBlocks(page, BLOCK_COUNT);
  await page.locator('.ve-library [role="tab"]', { hasText: 'Pages' }).click();
  for (let copy = 1; copy < 10; copy += 1) {
    await page.getByRole('button', { name: 'More actions for Home', exact: true }).click();
    await page.getByRole('menuitem', { name: 'Duplicate' }).click();
  }
  await expect(page.locator('.ve-page-name')).toHaveCount(10);
  await slowDownCpu(page);
  const startedAt = Date.now();
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  const downloadPromise = page.waitForEvent('download');
  await page
    .getByRole('dialog', { name: 'Export site' })
    .getByRole('button', { name: /Download zip|Export anyway/ })
    .click();
  await downloadPromise;
  const elapsed = Date.now() - startedAt;
  console.log(`10-page export in ${elapsed} ms`);
  expect(elapsed).toBeLessThan(EXPORT_BUDGET_MS);
});

test('the JavaScript loaded at startup stays under 300 KB gzipped', async () => {
  const build = join(import.meta.dirname, '../../build');
  const html = await readFile(join(build, 'index.html'), 'utf8');
  const scripts = [...html.matchAll(/(?:src|href)="\/(assets\/[^"]+\.js)"/g)];
  let total = 0;
  for (const [, path] of scripts) {
    if (path === undefined) continue;
    total += gzipSync(await readFile(join(build, path))).length;
  }
  console.log(
    `Startup JavaScript ${(total / 1024).toFixed(1)} KB gzipped in ${scripts.length} files`,
  );
  expect(total).toBeLessThan(MAIN_CHUNK_BUDGET);
});
