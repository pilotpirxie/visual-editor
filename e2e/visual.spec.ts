import { expect, test, type Page } from '@playwright/test';
import { createProject, insertEveryBlock, openProjectSettings } from './editor';

const PRESET_GROUPS = [
  ['Clean', 'Midnight', 'Playful', 'Corporate'],
  ['Editorial', 'Mono', 'Warm', 'Bold'],
  ['Nature', 'Pastel', 'Luxury', 'Brutalist'],
];

type CanvasWidth = 320 | 375 | 768 | 1440;

const WIDTHS: CanvasWidth[] = [320, 375, 768, 1440];

const DEVICE_FOR_WIDTH: Record<Exclude<CanvasWidth, 320>, string> = {
  375: 'Phone (375 px)',
  768: 'Tablet (768 px)',
  1440: 'Desktop (1440 px)',
};

async function showCanvasAt(page: Page, width: CanvasWidth): Promise<void> {
  if (width === 320) {
    await page.locator('label', { hasText: 'Responsive' }).click();
    await page.getByRole('separator', { name: 'Resize the page from its right edge' }).focus();
    await page.keyboard.press('Home');
  } else {
    await page.locator('label', { hasText: DEVICE_FOR_WIDTH[width] }).click();
  }
  await expect
    .poll(() =>
      page
        .frameLocator('.ve-canvas-frame')
        .locator('html')
        .evaluate((html) => html.clientWidth),
    )
    .toBe(width);
}

async function overflowingBlocks(page: Page): Promise<string[]> {
  return page
    .frameLocator('.ve-canvas-frame')
    .locator('html')
    .evaluate((html) => {
      const limit = html.clientWidth + 1;
      const problems: string[] = [];
      if (html.scrollWidth > limit) problems.push(`page is ${html.scrollWidth}px wide`);
      for (const block of html.querySelectorAll<HTMLElement>('[data-block-id]')) {
        if (
          block.scrollWidth <= block.clientWidth + 1 &&
          block.getBoundingClientRect().right <= limit
        ) {
          continue;
        }
        const offenders: string[] = [];
        for (const element of block.querySelectorAll('*')) {
          if (element.getBoundingClientRect().right > limit) {
            offenders.push(`${element.localName}.${[...element.classList].join('.')}`);
          }
        }
        const name = block.getAttribute('data-component') ?? 'html block';
        problems.push(`${name}: ${offenders.slice(0, 3).join(', ')}`);
      }
      return problems;
    });
}

async function applyPreset(page: Page, preset: string): Promise<void> {
  await page.getByRole('button', { name: 'Design system' }).click();
  const presets = page.getByRole('list', { name: 'Presets' });
  if (!(await presets.isVisible())) {
    await page.locator('.ve-design-sheet summary', { hasText: 'Presets' }).click();
  }
  await page.getByRole('button', { name: `Apply ${preset}` }).click();
  await page
    .getByRole('dialog', { name: `Apply ${preset}` })
    .getByRole('button', { name: 'Apply', exact: true })
    .click();
  await page.getByRole('button', { name: 'Close design system' }).click();
}

async function expectEveryWidthFits(page: Page, label: string): Promise<void> {
  for (const width of WIDTHS) {
    await showCanvasAt(page, width);
    expect(await overflowingBlocks(page), `${label} at ${width}px`).toEqual([]);
  }
}

for (const presets of PRESET_GROUPS) {
  test(`every block fits at every width in ${presets.join(', ')}`, async ({ page }) => {
    test.setTimeout(300_000);
    await createProject(page);
    expect(await insertEveryBlock(page)).toBeGreaterThanOrEqual(80);
    for (const preset of presets) {
      await applyPreset(page, preset);
      await expectEveryWidthFits(page, preset);
    }
  });
}

test('long site titles and long link words still fit on a phone', async ({ page }) => {
  test.setTimeout(300_000);
  await createProject(page);
  const settings = await openProjectSettings(page);
  await settings
    .getByLabel('Site title')
    .fill('Northwind Analytics International Consulting Groupwideunbreakablename');
  await settings.getByRole('button', { name: 'Done' }).click();
  expect(await insertEveryBlock(page)).toBeGreaterThanOrEqual(80);
  await page.getByRole('button', { name: /^Edit/ }).click();
  await page.getByRole('menuitem', { name: 'Find and replace…' }).click();
  const dialog = page.getByRole('dialog', { name: 'Find and replace' });
  await dialog.getByLabel('Find').fill('Pricing');
  await dialog.getByLabel('Replace with').fill('pricing-and-plans-for-growing-teams');
  await dialog.getByRole('button', { name: /^Replace \d+ match/ }).click();
  await dialog.getByRole('button', { name: 'Close' }).click();
  await showCanvasAt(page, 320);
  expect(await overflowingBlocks(page), 'long content at 320px').toEqual([]);
});

test('every block fits in a right-to-left site', async ({ page }) => {
  test.setTimeout(300_000);
  await createProject(page);
  const settings = await openProjectSettings(page);
  await settings.getByLabel('Language').selectOption('ar');
  await settings.getByRole('button', { name: 'Done' }).click();
  await expect(page.frameLocator('.ve-canvas-frame').locator('html')).toHaveAttribute('dir', 'rtl');
  expect(await insertEveryBlock(page)).toBeGreaterThanOrEqual(80);
  for (const width of [375, 1440] as const) {
    await showCanvasAt(page, width);
    expect(await overflowingBlocks(page), `right to left at ${width}px`).toEqual([]);
  }
});
