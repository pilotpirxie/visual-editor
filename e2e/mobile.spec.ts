import { expect, test, type Page } from '@playwright/test';

const MIN_INPUT_FONT_SIZE_PX = 16;

async function tapTab(page: Page, name: string): Promise<void> {
  await page.locator('.ve-compact-tabs').getByRole('button', { name }).tap();
}

async function markCanvasDocument(page: Page): Promise<void> {
  await page.evaluate(() => {
    const view = document.querySelector<HTMLIFrameElement>('.ve-canvas-frame')?.contentWindow;
    if (view) Object.assign(view, { keptAlive: true });
  });
}

async function isCanvasDocumentKept(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const view = document.querySelector<HTMLIFrameElement>('.ve-canvas-frame')?.contentWindow;
    return view !== null && view !== undefined && 'keptAlive' in view;
  });
}

test('a site can be built on a phone, one view at a time', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'New project' }).tap();
  await page.getByRole('button', { name: 'Start with Clean' }).tap();
  const tabs = page.locator('.ve-compact-tabs');
  await expect(tabs).toBeVisible();
  await expect(tabs.getByRole('button')).toHaveText([
    'Blocks',
    'Pages',
    'Layers',
    'Canvas',
    'Properties',
  ]);
  await expect(page.locator('.ve-canvas')).toBeVisible();
  await markCanvasDocument(page);

  await tapTab(page, 'Blocks');
  await expect(page.locator('.ve-library')).toBeVisible();
  await expect(page.locator('.ve-canvas')).toBeHidden();
  await page.locator('.ve-categories button', { hasText: 'Headers' }).tap();
  await page.getByRole('button', { name: 'Hero, centered text' }).tap();

  await expect(tabs.getByRole('button', { name: 'Canvas' })).toHaveAttribute(
    'aria-current',
    'page',
  );
  const canvas = page.frameLocator('.ve-canvas-frame');
  await expect(canvas.locator('.b-hero-centered')).toBeVisible();

  await page.getByRole('button', { name: 'Edit Hero, centered text' }).tap();
  const title = page.locator('[data-field-path="title"] textarea');
  await expect(title).toBeVisible();
  const fontSize = await title.evaluate((input) => parseFloat(getComputedStyle(input).fontSize));
  expect(fontSize).toBeGreaterThanOrEqual(MIN_INPUT_FONT_SIZE_PX);
  await title.fill('Built on a phone');

  await tapTab(page, 'Layers');
  await expect(page.locator('.ve-layer-name')).toHaveText(['Hero, centered text']);

  await tapTab(page, 'Canvas');
  await expect(canvas.locator('h1')).toHaveText('Built on a phone');
  expect(await isCanvasDocumentKept(page)).toBe(true);

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});

async function startOnPhone(page: Page): Promise<void> {
  await page.goto('/');
  await page.getByRole('button', { name: 'New project' }).tap();
  await page.getByRole('button', { name: 'Start with Clean' }).tap();
  await expect(page.locator('.ve-compact-tabs')).toBeVisible();
}

async function horizontalOverflow(page: Page): Promise<number> {
  return page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
}

test('the phone toolbar is one row of full-size targets', async ({ page }) => {
  await startOnPhone(page);
  const toolbar = await page.locator('.ve-toolbar').boundingBox();
  expect(toolbar?.height ?? 0).toBeLessThanOrEqual(60);
  for (const control of await page.locator('.ve-toolbar :is(button, a, select):visible').all()) {
    const box = await control.boundingBox();
    expect(
      box?.height ?? 0,
      (await control.getAttribute('aria-label')) ?? '',
    ).toBeGreaterThanOrEqual(44);
  }
  expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
});

test('pages can be added, renamed and set up on a phone', async ({ page }) => {
  await startOnPhone(page);
  await tapTab(page, 'Pages');
  await page.getByRole('button', { name: 'Add page' }).tap();
  const addDialog = page.getByRole('dialog', { name: 'Add page' });
  await addDialog.getByLabel('Name').fill('Pricing');
  await addDialog.getByRole('button', { name: 'Add page' }).tap();
  await expect(page.locator('.ve-page-name[aria-current="page"] > span').first()).toHaveText(
    'Pricing',
  );

  await tapTab(page, 'Pages');
  await page.getByRole('button', { name: 'More actions for Pricing' }).tap();
  await page.getByRole('menuitem', { name: 'Page settings' }).tap();
  await expect(
    page.locator('.ve-compact-tabs').getByRole('button', { name: 'Properties' }),
  ).toHaveAttribute('aria-current', 'page');
  await page.getByLabel('Page title').fill('Plans and prices');
  await expect(page.getByLabel('Page title')).toHaveValue('Plans and prices');
});

test('block actions are reachable from the Layers list without a right-click', async ({ page }) => {
  await startOnPhone(page);
  await tapTab(page, 'Blocks');
  await page.locator('.ve-categories button', { hasText: 'Headers' }).tap();
  await page.getByRole('button', { name: 'Hero, centered text' }).tap();
  await tapTab(page, 'Layers');
  await page.getByRole('button', { name: 'More actions for Hero, centered text' }).tap();
  await page.getByRole('menuitem', { name: 'Duplicate' }).tap();
  await expect(page.locator('.ve-layer-name')).toHaveText([
    'Hero, centered text',
    'Hero, centered text',
  ]);
});

test('the design system, project settings and export work on a phone', async ({ page }) => {
  await startOnPhone(page);
  await page.getByRole('button', { name: 'Design system' }).tap();
  await page.locator('.ve-design-sheet summary', { hasText: 'Presets' }).tap();
  await page.getByRole('button', { name: 'Apply Midnight' }).tap();
  await page
    .getByRole('dialog', { name: 'Apply Midnight' })
    .getByRole('button', { name: 'Apply', exact: true })
    .tap();
  await expect(page.getByRole('list', { name: 'Presets' }).getByText('Current')).toBeVisible();
  await page.getByLabel('Heading weight').selectOption('500');
  await expect(page.getByLabel('Heading weight')).toHaveValue('500');
  expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
  await page.getByRole('button', { name: 'Close design system' }).tap();

  await page.getByRole('button', { name: /^File/ }).tap();
  await page.getByRole('menuitem', { name: 'Project settings…' }).tap();
  const settings = page.getByRole('dialog', { name: 'Project settings' });
  await settings.getByLabel('Site title').fill('Pocket site');
  const settingsBox = await settings.boundingBox();
  expect(settingsBox?.width ?? 0).toBeLessThanOrEqual(page.viewportSize()?.width ?? 0);
  await settings.getByRole('button', { name: 'Done' }).tap();
  await expect(page).toHaveTitle(/ · Pocket site – Visual Editor$/);

  await page.getByRole('button', { name: 'Export' }).tap();
  await expect(page.getByRole('dialog', { name: 'Export site' })).toBeVisible();
});

test('the home screen fits a phone screen', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'My projects' })).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});

test('a phone switches the canvas device from a menu and finds Help in the File menu', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'New project' }).tap();
  await page.getByRole('button', { name: 'Start with Clean' }).tap();
  await page.getByRole('button', { name: 'Device: Responsive' }).tap();
  await page.getByRole('menuitemcheckbox', { name: 'Phone (375 px)' }).tap();
  await expect(page.getByRole('button', { name: 'Device: Phone' })).toBeVisible();
  await page.getByRole('button', { name: 'File', exact: true }).tap();
  await page.getByRole('menuitem', { name: 'Help' }).tap();
  await expect(page.getByRole('dialog', { name: 'Help' })).toBeVisible();
});
