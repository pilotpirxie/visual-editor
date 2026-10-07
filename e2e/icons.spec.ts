import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import { createProject, insertBlock, readZip } from './editor';

function canvas(page: Page) {
  return page.frameLocator('.ve-canvas-frame');
}

async function svgOf(page: Page, selector: string): Promise<string> {
  return canvas(page)
    .locator(selector)
    .first()
    .evaluate((element) => element.innerHTML);
}

test('icons come from any set, and switching the default set swaps only default icons', async ({
  page,
}) => {
  await createProject(page);
  await insertBlock(page, 'Navigations', 'Navigation, logo left');
  await page.getByRole('button', { name: 'Menu icon Change' }).click();
  await page.getByLabel('Icon set').selectOption({ label: 'Tabler Icons' });
  await page.getByLabel('Search icons').fill('rocket');
  await page.getByRole('button', { name: 'rocket', exact: true }).click();
  await expect(page.locator('.ve-icon-name')).toHaveText('rocket · Tabler Icons');
  const pickedIcon = await svgOf(page, '.b-toggle svg');

  await insertBlock(page, 'Features', 'Features grid, 3 columns');
  const lucideIcon = await svgOf(page, '.b-features-grid-3 .b-icon svg');

  await page.getByRole('button', { name: 'Design system' }).click();
  await page.getByLabel('Default icon set').selectOption({ label: 'Remix Icon' });
  await expect.poll(() => svgOf(page, '.b-features-grid-3 .b-icon svg')).not.toBe(lucideIcon);
  expect(await svgOf(page, '.b-toggle svg')).toBe(pickedIcon);

  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  const downloadPromise = page.waitForEvent('download');
  await page
    .getByRole('dialog', { name: 'Export site' })
    .getByRole('button', { name: /Download zip|Export anyway/ })
    .click();
  const files = readZip(await readFile(await (await downloadPromise).path()));
  const html = files.get('index.html')?.toString('utf8') ?? '';
  expect(html).toContain('<symbol id="icon-tabler-rocket"');
  expect(html).toContain('<symbol id="icon-remix-flashlight-line"');
  expect(html).not.toMatch(/<link[^>]+(icon|font-awesome)/i);
  expect(files.get('licenses.txt')?.toString('utf8')).toContain('Remix Icon');
});
