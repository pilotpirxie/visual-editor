import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { checkAccessibility, type Violation } from './a11y';
import { createProject, insertBlock, openLibraryTab, openProjectSettings, readZip } from './editor';

const STARTERS_LOAD_TIMEOUT_MS = 15_000;
const MVP_STARTERS = ['SaaS product', 'Mobile app launch', 'Startup waitlist'];
const SITE_WIDTHS = [375, 1440];

function expectNoViolations(violations: Violation[]): void {
  expect(violations, JSON.stringify(violations, null, 2)).toEqual([]);
}

async function expectAccessible(page: Page): Promise<void> {
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
  await dialog.getByRole('button', { name: /Download zip|Export anyway/ }).click();
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

test('the home screen and the new project dialog are accessible', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('You have no projects yet.')).toBeVisible();
  await expectAccessible(page);
  await page.getByRole('button', { name: 'New project' }).click();
  await expectAccessible(page);
  await closeDialog(page);
  await createProject(page);
  await page.goto('/');
  await expect(page.getByRole('list', { name: 'Projects' })).toBeVisible();
  await expectAccessible(page);
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
  await page.getByRole('button', { name: 'Design system' }).click();
  await expectAccessible(page);
});

test('the editor dialogs are accessible', async ({ page }) => {
  await createProject(page);
  await insertBlock(page, 'Headers', 'Hero, centered text');

  await page.getByRole('button', { name: 'Export', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Export site' }).getByText(/files,/)).toBeVisible();
  await expectAccessible(page);
  await closeDialog(page);

  await expect(await openProjectSettings(page)).toBeVisible();
  await expectAccessible(page);
  await closeDialog(page);

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
  await settings.getByRole('button', { name: 'Done' }).click();
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
