import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { checkAccessibility, type Violation } from './a11y';
import {
  closeLibraryDrawer,
  createProject,
  insertBlock,
  openLibraryTab,
  openProjectSettings,
  readZip,
} from './editor';
import { stubOpenRouter, useAssistantSettings } from './fixtures/assistant';

const STARTERS_LOAD_TIMEOUT_MS = 15_000;
const MAX_TRANSITION_PASSES = 30;
const MVP_STARTERS = ['SaaS product', 'Mobile app launch', 'Startup waitlist'];
const SITE_WIDTHS = [375, 1440];
const APPEARANCES = ['light', 'dark'] as const;

function expectNoViolations(violations: Violation[]): void {
  expect(violations, JSON.stringify(violations, null, 2)).toEqual([]);
}

async function transitionsFinished(page: Page): Promise<void> {
  await page.evaluate(async (maxPasses) => {
    for (let pass = 0; pass < maxPasses; pass += 1) {
      const running: Promise<Animation>[] = [];
      for (const animation of document.getAnimations()) {
        if (animation instanceof CSSTransition) running.push(animation.finished);
      }
      if (running.length === 0) return;
      await Promise.allSettled(running);
    }
  }, MAX_TRANSITION_PASSES);
}

async function expectAccessible(page: Page): Promise<void> {
  await transitionsFinished(page);
  expectNoViolations(await checkAccessibility(page));
}

async function closeDialog(page: Page): Promise<void> {
  await page.keyboard.press('Escape');
  await expect(page.locator('dialog[open]')).toHaveCount(0);
}

async function openFromMenu(page: Page, menu: 'File' | 'Edit', item: string): Promise<void> {
  await page.getByRole('button', { name: new RegExp(`^${menu}`) }).click();
  await page.getByRole('menuitem', { name: item }).click();
  await expect(page.locator('dialog[open]')).toHaveCount(1);
}

async function exportSite(page: Page, testInfo: TestInfo, folderName: string): Promise<string> {
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Export site' });
  const downloadPromise = page.waitForEvent('download');
  await dialog.getByRole('button', { name: 'Download zip' }).click();
  const files = readZip(await readFile(await (await downloadPromise).path()));
  const folder = testInfo.outputPath(folderName);
  for (const [path, content] of files) {
    const target = join(folder, path);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, content);
  }
  return pathToFileURL(join(folder, 'index.html')).href;
}

async function startFromStarter(page: Page, name: string): Promise<void> {
  await page.goto('/');
  await page.getByRole('button', { name: 'New project' }).click();
  const newProject = page.getByRole('dialog', { name: 'New project' });
  await newProject.getByRole('tab', { name: 'Starters' }).click();
  await newProject
    .getByRole('button', { name: `Preview ${name}` })
    .click({ timeout: STARTERS_LOAD_TIMEOUT_MS });
  await page
    .getByRole('dialog', { name })
    .getByRole('button', { name: 'Use this starter' })
    .click();
  await expect(page.locator('.ve-toolbar')).toBeVisible();
}

for (const appearance of APPEARANCES) {
  test.describe(`in ${appearance} mode`, () => {
    test.beforeEach(async ({ page }) => {
      if (appearance === 'light') return;
      await page.addInitScript(() => localStorage.setItem('ve-appearance', 'dark'));
    });

    test.afterEach(async ({ page }) => {
      const shown = await page.locator('html').getAttribute('data-ve-appearance');
      expect(shown ?? 'light').toBe(appearance);
    });

    test('the home screen and the new project dialog are accessible', async ({ page }) => {
      await page.goto('/');
      await expect(page.getByRole('heading', { name: 'Start from a starter' })).toBeVisible();
      await expectAccessible(page);
      await page.getByRole('button', { name: 'New project' }).click();
      await expectAccessible(page);
      await closeDialog(page);
      await createProject(page);
      await page.goto('/');
      await expect(page.getByRole('list', { name: 'Projects' })).toBeVisible();
      await expectAccessible(page);
    });

    test('App settings and the site assistant are accessible', async ({ page }) => {
      await stubOpenRouter(page, { hasQuestions: true });
      await page.goto('/');
      await expect(page.getByRole('heading', { name: 'Tell us about your site' })).toBeVisible();
      await page.getByRole('button', { name: 'App settings', exact: true }).click();
      const settings = page.getByRole('dialog', { name: 'App settings' });
      await expect(settings).toBeVisible({ timeout: STARTERS_LOAD_TIMEOUT_MS });
      await expectAccessible(page);
      await settings.getByRole('tab', { name: 'Assistant' }).click();
      await settings.getByLabel('OpenRouter API key').fill('sk-or-test');
      await settings.getByRole('button', { name: 'Load models' }).click();
      await settings.getByRole('button', { name: /^Acme Writer/ }).click();
      await expectAccessible(page);
      await closeDialog(page);

      await page.getByRole('textbox', { name: 'Tell us about your site' }).fill('A bakery site');
      await expectAccessible(page);
      await page.getByRole('button', { name: 'Build my site' }).click();
      const questions = page.getByRole('dialog', { name: 'A few quick questions' });
      await expect(questions).toBeVisible({ timeout: STARTERS_LOAD_TIMEOUT_MS });
      await expectAccessible(page);
      await questions.getByRole('button', { name: 'By phone only' }).click();
      await questions.getByRole('button', { name: 'Menu' }).click();
      await expectAccessible(page);
      await closeDialog(page);
    });

    test('the build screen of the site assistant is accessible', async ({ page }) => {
      const stub = await stubOpenRouter(page, { holdsWriting: true });
      await useAssistantSettings(page);
      await page.goto('/');
      await page.getByRole('textbox', { name: 'Tell us about your site' }).fill('A bakery site');
      await page.getByRole('button', { name: 'Build my site' }).click();
      const question = page.getByRole('dialog', { name: 'One quick question' });
      await expect(
        question.getByRole('heading', { name: 'How big should the site be?' }),
      ).toBeFocused({ timeout: STARTERS_LOAD_TIMEOUT_MS });
      await page.keyboard.press('Enter');

      const building = page.getByRole('dialog', { name: 'Building your site' });
      const preview = building.frameLocator('.ve-site-preview-frame');
      await expect(preview.locator('.b-hero-centered')).toBeVisible();
      await expectAccessible(page);
      await expect.poll(() => stub.steps).toContain('Home');
      stub.releaseWriting('Home');
      await expect(preview.locator('h1')).toHaveText('Bread worth getting up for');
      await building.getByRole('radio', { name: 'Menu' }).check({ force: true });
      await expect(preview.locator('.b-pricing-3-plans')).toBeVisible();
      await expectAccessible(page);
      await closeDialog(page);
    });

    test('the editor panels and tabs are accessible', async ({ page }) => {
      await createProject(page);
      await expectAccessible(page);
      await insertBlock(page, 'Headers', 'Hero, centered text');
      await expectAccessible(page);
      for (const tab of ['Style', 'Advanced', 'Content']) {
        await page.getByRole('tab', { name: tab }).click();
        await expectAccessible(page);
      }
      await openLibraryTab(page, 'Layers');
      await expectAccessible(page);
      await openLibraryTab(page, 'Pages');
      await expectAccessible(page);
      await page.getByRole('button', { name: 'Design', exact: true }).click();
      await expectAccessible(page);
    });

    test('the editor dialogs are accessible', async ({ page }) => {
      await createProject(page);
      await insertBlock(page, 'Headers', 'Hero, centered text');

      await page.getByRole('button', { name: 'Export', exact: true }).click();
      await expect(
        page.getByRole('dialog', { name: 'Export site' }).getByText(/files,/),
      ).toBeVisible();
      await expectAccessible(page);
      await closeDialog(page);

      await expect(await openProjectSettings(page)).toBeVisible();
      await expectAccessible(page);
      await closeLibraryDrawer(page);

      for (const [menu, item] of [
        ['File', 'Snapshots…'],
        ['Edit', 'Find and replace…'],
        ['Edit', 'Save block…'],
      ] as const) {
        await openFromMenu(page, menu, item);
        await expectAccessible(page);
        await closeDialog(page);
      }

      await page.keyboard.press('ControlOrMeta+K');
      await expect(page.getByRole('dialog', { name: 'Command palette' })).toBeVisible();
      await expectAccessible(page);
      await closeDialog(page);

      await page.getByRole('button', { name: 'Help' }).click();
      await expect(page.getByRole('dialog', { name: 'Help' })).toBeVisible();
      await expectAccessible(page);
      await closeDialog(page);
    });
  });
}

for (const starter of MVP_STARTERS) {
  test(`the exported ${starter} starter meets the checks at phone and desktop widths`, async ({
    page,
  }, testInfo) => {
    await startFromStarter(page, starter);
    const home = await exportSite(page, testInfo, 'site');
    for (const width of SITE_WIDTHS) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(home);
      expectNoViolations(await checkAccessibility(page, { isSitePage: true }));
    }
  });
}

test('an Arabic site exports right to left and still meets the checks', async ({
  page,
}, testInfo) => {
  await startFromStarter(page, 'Startup waitlist');
  const settings = await openProjectSettings(page);
  await settings.getByLabel('Language').selectOption('ar');
  await closeLibraryDrawer(page);
  const home = await exportSite(page, testInfo, 'arabic');
  await page.goto(home);
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  expectNoViolations(await checkAccessibility(page, { isSitePage: true }));
});

test('the checker reports the problems it looks for', async ({ page }) => {
  await page.setContent(`<!doctype html><html><body>
    <main>
      <h1>Title</h1>
      <h3>Skipped level</h3>
      <p style="color: #cccccc; background: #ffffff">Pale text</p>
      <button type="button"></button>
      <img src="data:image/gif;base64,R0lGODlhAQABAAAAACw=">
      <span id="twice"></span><span id="twice"></span>
      <div tabindex="2">Jumps the queue</div>
    </main>
  </body></html>`);
  const rules = (await checkAccessibility(page, { isSitePage: true })).map(
    (violation) => violation.rule,
  );
  expect(new Set(rules)).toEqual(
    new Set(['name', 'alt', 'unique-id', 'lang', 'dir', 'heading-order', 'tabindex', 'contrast']),
  );
});
