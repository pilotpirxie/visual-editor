import { expect, test, type Page } from '@playwright/test';
import { createProject, insertBlock, storedProject } from './editor';

function canvasNav(page: Page) {
  return page.frameLocator('.ve-canvas-frame').locator('.b-nav-simple');
}

test('a second tab opens the project read-only and follows the first tab', async ({ context }) => {
  const first = await context.newPage();
  await createProject(first);
  const second = await context.newPage();
  await second.goto(first.url());

  await expect(second.getByRole('status').filter({ hasText: 'open in another tab' })).toBeVisible();
  await expect(second.getByRole('button', { name: 'Undo' })).toBeDisabled();
  await expect(second.getByRole('button', { name: /^Edit/ })).toBeDisabled();
  await expect(first.getByRole('status').filter({ hasText: 'open in another tab' })).toHaveCount(0);

  await insertBlock(first, 'Navigations', 'Navigation, logo left');
  await expect(canvasNav(second)).toBeVisible({ timeout: 10_000 });
  await expect.poll(async () => (await storedProject(second))?.pages.ids.length).toBe(1);

  await first.close();
  await expect(second.getByText('You can edit this project now.')).toBeVisible({ timeout: 10_000 });
  await expect(second.getByRole('status').filter({ hasText: 'open in another tab' })).toHaveCount(
    0,
  );
  await expect(second.getByRole('button', { name: /^Edit/ })).toBeEnabled();
});

test('deleting a project from the home screen closes it in the tab that has it open', async ({
  context,
}) => {
  const editor = await context.newPage();
  await createProject(editor);
  const home = await context.newPage();
  await home.goto('/');
  home.on('dialog', (dialog) => {
    expect(dialog.message()).toContain('is open in another tab');
    void dialog.accept();
  });
  await home.getByRole('button', { name: 'Delete Untitled site' }).click();
  await expect(editor).toHaveURL(/\/$/);
  await expect(editor.getByText('was deleted in another tab')).toBeVisible();
});
