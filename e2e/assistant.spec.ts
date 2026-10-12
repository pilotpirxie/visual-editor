import { expect, test, type Page } from '@playwright/test';
import { createProject, insertBlock, layerNames, openPage, storedProject } from './editor';
import { stubOpenRouter, useAssistantSettings } from './fixtures/assistant';

const BUILD_TIMEOUT_MS = 30_000;
const DIALOG_LOAD_TIMEOUT_MS = 15_000;

async function openAppSettingsFromHome(page: Page): Promise<void> {
  await page.goto('/');
  await page.getByRole('button', { name: 'App settings', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'App settings' })).toBeVisible({
    timeout: DIALOG_LOAD_TIMEOUT_MS,
  });
}

async function openAppSettingsFromFileMenu(page: Page): Promise<void> {
  await page.getByRole('button', { name: /^File/ }).click();
  await page.getByRole('menuitem', { name: 'App settings…' }).click();
  await expect(page.getByRole('dialog', { name: 'App settings' })).toBeVisible({
    timeout: DIALOG_LOAD_TIMEOUT_MS,
  });
}

async function describeSite(page: Page): Promise<void> {
  await page.goto('/');
  await page.getByRole('textbox', { name: 'Tell us about your site' }).fill('A site for my bakery');
  await page.getByRole('button', { name: 'Build my site' }).click();
}

async function projectCount(page: Page): Promise<number> {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Tell us about your site' })).toBeVisible();
  return page.locator('.ve-home-card').count();
}

test('nothing is sent to OpenRouter until models are loaded', async ({ page }) => {
  const stub = await stubOpenRouter(page);
  await openAppSettingsFromHome(page);
  const dialog = page.getByRole('dialog', { name: 'App settings' });
  await dialog.getByRole('tab', { name: 'Assistant' }).click();
  await expect(dialog.getByRole('button', { name: 'Load models' })).toBeDisabled();
  await dialog.getByLabel('OpenRouter API key').fill('sk-or-test');
  await dialog.getByRole('tab', { name: 'General' }).click();
  await dialog.getByRole('tab', { name: 'Assistant' }).click();
  expect(stub.steps).toEqual([]);
  await dialog.getByRole('button', { name: 'Load models' }).click();
  await expect(dialog.getByText('2 models can build sites.')).toBeVisible();
  expect(stub.steps).toEqual(['models']);
});

test('the key, model and effort are remembered and shown in the editor too', async ({ page }) => {
  test.slow();
  await stubOpenRouter(page);
  await openAppSettingsFromHome(page);
  const dialog = page.getByRole('dialog', { name: 'App settings' });
  await dialog.getByRole('tab', { name: 'Assistant' }).click();
  await dialog.getByLabel('OpenRouter API key').fill('sk-or-test');
  await dialog.getByRole('button', { name: 'Load models' }).click();
  await dialog.getByRole('searchbox', { name: 'Search models' }).fill('writer');
  await dialog.getByRole('button', { name: /^Acme Writer/ }).click();
  await dialog.getByLabel('Reasoning effort').selectOption('high');
  await dialog.getByRole('button', { name: 'Done' }).click();
  const setupHint = page.getByRole('button', { name: 'Open App settings' });
  await expect(setupHint).toHaveCount(0);
  await expect(page.getByText('Acme Writer')).toHaveCount(0);

  await page.reload();
  await expect(page.getByRole('heading', { name: 'Tell us about your site' })).toBeVisible();
  await expect(setupHint).toHaveCount(0);
  await createProject(page);
  await openAppSettingsFromFileMenu(page);
  await dialog.getByRole('tab', { name: 'Assistant' }).click();
  await expect(dialog.getByLabel('OpenRouter API key')).toHaveValue('sk-or-test');
  await expect(dialog.getByLabel('OpenRouter API key')).toHaveAttribute('type', 'password');
  await expect(dialog.getByText('Acme Writer', { exact: true })).toBeVisible();
  await expect(dialog.getByLabel('Reasoning effort')).toHaveValue('high');
  const saved = await storedProject(page);
  expect(JSON.stringify(saved)).not.toContain('sk-or-test');
});

test('a project opens at the canvas size chosen in App settings', async ({ page }) => {
  await openAppSettingsFromHome(page);
  const dialog = page.getByRole('dialog', { name: 'App settings' });
  await dialog.getByLabel('Canvas size when a project opens').selectOption('phone');
  await dialog.getByRole('button', { name: 'Done' }).click();
  await createProject(page);
  await expect(page.locator('label', { hasText: 'Phone (375 px)' }).locator('input')).toBeChecked();
  const canvas = page.frameLocator('.ve-canvas-frame');
  await expect.poll(() => canvas.locator('html').evaluate(() => window.innerWidth)).toBe(375);
});

test('deleting a block asks first when the setting is on', async ({ page }) => {
  await createProject(page);
  await insertBlock(page, 'Headers', 'Hero, centered text');
  await openAppSettingsFromFileMenu(page);
  const settings = page.getByRole('dialog', { name: 'App settings' });
  await settings.getByRole('switch', { name: 'Ask before deleting a block' }).check();
  await settings.getByRole('button', { name: 'Done' }).click();

  const hero = page.frameLocator('.ve-canvas-frame').locator('.b-hero-centered');
  await hero.click({ position: { x: 5, y: 5 } });
  await page.keyboard.press('Delete');
  const question = page.getByRole('dialog', { name: 'Delete “Hero, centered text”?' });
  await question.getByRole('button', { name: 'Cancel' }).click();
  await expect(hero).toBeVisible();

  await page.keyboard.press('Delete');
  await question.getByRole('button', { name: 'Delete block' }).click();
  await expect(hero).toHaveCount(0);
  await page.keyboard.press('ControlOrMeta+z');
  await expect(hero).toBeVisible();
});

test('the home prompt points to App settings until the assistant is set up', async ({ page }) => {
  const stub = await stubOpenRouter(page);
  await page.goto('/');
  await page.getByRole('textbox', { name: 'Tell us about your site' }).fill('A site for my bakery');
  await expect(page.getByRole('button', { name: 'Build my site' })).toBeDisabled();
  await page.getByRole('button', { name: 'Open App settings' }).click();
  await expect(page.getByLabel('OpenRouter API key')).toBeVisible();
  expect(stub.steps).toEqual([]);
});

test('a description becomes a site after one round of questions', async ({ page }) => {
  const stub = await stubOpenRouter(page, { hasQuestions: true });
  await useAssistantSettings(page);
  await describeSite(page);

  const questions = page.getByRole('dialog', { name: 'A few quick questions' });
  await expect(questions.getByText('Question 1 of 4')).toBeVisible();
  const viewport = page.viewportSize();
  expect(await questions.boundingBox()).toEqual({ x: 0, y: 0, ...viewport });
  await expect(page.getByText('Used so far')).toHaveCount(0);
  await expect(
    questions.getByRole('heading', { name: 'Do you take orders online?' }),
  ).toBeFocused();
  await page.keyboard.press('b');

  await expect(questions.getByText('Question 2 of 4')).toBeVisible();
  const menu = questions.getByRole('button', { name: 'Menu (suggested)' });
  const story = questions.getByRole('button', { name: 'Our story' });
  await expect(menu).toHaveAttribute('aria-pressed', 'true');
  await story.click();
  await page.keyboard.press('Enter');

  await expect(questions.getByText('Question 3 of 4')).toBeVisible();
  await questions.getByRole('button', { name: 'Back' }).click();
  await expect(story).toHaveAttribute('aria-pressed', 'true');
  await questions.getByRole('button', { name: 'OK' }).click();
  await questions.getByLabel('Your own answer').fill('Leeds');
  expect(stub.steps).toEqual(['site_clarification']);
  await questions.getByLabel('Your own answer').press('Enter');

  await expect(
    questions.getByRole('heading', { name: 'How big should the site be?' }),
  ).toBeFocused();
  const standard = questions.getByRole('button', { name: 'Home plus a few pages (suggested)' });
  await expect(standard).toHaveAttribute('aria-pressed', 'true');
  expect(stub.steps).toEqual(['site_clarification']);
  await page.keyboard.press('Enter');

  await expect(page.locator('.ve-toolbar')).toBeVisible({ timeout: BUILD_TIMEOUT_MS });
  await expect(page.getByText(/Your site is ready\. It used 10,500 tokens/)).toBeVisible();
  expect(stub.steps.slice(0, 4)).toEqual([
    'site_clarification',
    'site_clarification',
    'design_brief',
    'site_plan',
  ]);
  expect([...stub.steps.slice(4)].sort()).toEqual(['Home', 'Menu', 'shared']);

  const canvas = page.frameLocator('.ve-canvas-frame');
  await expect(canvas.locator('.b-nav-simple')).toContainText('Our menu');
  await expect(canvas.locator('.b-hero-centered h1')).toHaveText('Bread worth getting up for');
  await expect(canvas.locator('.b-features-grid-3 h2')).toHaveText('Why people queue');
  await expect(canvas.locator('[data-html-block] h2')).toHaveText('Opening hours');
  await expect(canvas.locator('[data-html-block] table')).toContainText('Monday to Saturday');
  await expect(canvas.locator('[data-html-block] img')).toHaveCount(0);
  await expect(canvas.locator('.b-cta-centered')).toContainText('Order a cake for Saturday');
  await expect(canvas.locator('.b-footer-simple')).toBeVisible();
  expect(await page.evaluate(() => 'stolen' in window)).toBe(false);

  await expect(canvas.locator('h1')).toHaveCSS('font-family', /Fraunces/);
  const background = await canvas.locator('body').evaluate((body) => {
    return getComputedStyle(body).getPropertyValue('--color-background').trim();
  });
  expect(background).toBe('#fff8f0');

  const project = await storedProject(page);
  const pageNames = project?.pages.ids.map((id) => project.pages.entities[id]?.name);
  expect(pageNames).toEqual(['Home', 'Menu']);
  expect(project?.settings.title).toBe('Crumb & Co');
  expect(await layerNames(page)).toContain('HTML block');
});

test('an image model is picked in App settings and can be removed', async ({ page }) => {
  const stub = await stubOpenRouter(page);
  await useAssistantSettings(page);
  await openAppSettingsFromHome(page);
  const settings = page.getByRole('dialog', { name: 'App settings' });
  await settings.getByRole('tab', { name: 'Assistant' }).click();
  await expect(settings.getByText('No image model chosen')).toBeVisible();
  await settings.getByRole('button', { name: 'Load image models' }).click();
  await settings.getByRole('button', { name: /^Acme Painter/ }).click();
  expect(stub.steps).toEqual(['image-models']);
  await settings.getByRole('button', { name: 'Done' }).click();
  await page.getByRole('button', { name: 'App settings', exact: true }).click();
  await settings.getByRole('tab', { name: 'Assistant' }).click();
  await expect(settings.getByText('Acme Painter')).toBeVisible();
  await settings.getByRole('button', { name: 'Remove image model' }).click();
  await expect(settings.getByText('No image model chosen')).toBeVisible();
});

test('with an image model the assistant asks about images and creates them', async ({ page }) => {
  const stub = await stubOpenRouter(page, { hasImagePage: true });
  await useAssistantSettings(page, true);
  await describeSite(page);

  const question = page.getByRole('dialog', { name: 'A few quick questions' });
  await expect(
    question.getByRole('heading', { name: 'How big should the site be?' }),
  ).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(
    question.getByRole('heading', { name: 'Real images or placeholders?' }),
  ).toBeFocused();
  const yes = question.getByRole('button', { name: 'Real images (suggested)' });
  await expect(yes).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('Enter');

  await expect(page.locator('.ve-toolbar')).toBeVisible({ timeout: BUILD_TIMEOUT_MS });
  await expect(
    page.getByText(/Your site is ready\. It used 13,000 tokens \(\$0\.112\)/),
  ).toBeVisible();
  expect(stub.steps.filter((step) => step === 'image')).toHaveLength(1);
  expect(stub.steps.filter((step) => step === 'site_clarification')).toHaveLength(1);

  await openPage(page, 'Menu');
  const picture = page.frameLocator('.ve-canvas-frame').locator('.b-cta-image img');
  await expect(picture).toHaveAttribute('src', /^data:image\/(webp|jpeg);base64,/);
  await picture.scrollIntoViewIfNeeded();
  await expect
    .poll(() => picture.evaluate((image: HTMLImageElement) => image.naturalWidth))
    .toBe(64);
  expect(await picture.evaluate((image: HTMLImageElement) => image.naturalHeight)).toBe(64);
});

test('without an image model the assistant never asks about images', async ({ page }) => {
  const stub = await stubOpenRouter(page, { hasImagePage: true });
  await useAssistantSettings(page);
  await describeSite(page);
  const question = page.getByRole('dialog', { name: 'One quick question' });
  await expect(
    question.getByRole('heading', { name: 'How big should the site be?' }),
  ).toBeFocused();
  await expect(question.getByText('Question 1 of 1')).toBeVisible();
  await page.keyboard.press('Enter');
  await expect(page.locator('.ve-toolbar')).toBeVisible({ timeout: BUILD_TIMEOUT_MS });
  expect(stub.steps).not.toContain('image');
});

test('a refused key is explained and no project is created', async ({ page }) => {
  await stubOpenRouter(page, { failingStatus: 401 });
  await useAssistantSettings(page);
  await describeSite(page);
  const dialog = page.getByRole('dialog', { name: 'Building your site' });
  await expect(dialog.getByRole('alert')).toHaveText(
    'OpenRouter did not accept the API key. Check it in App settings.',
  );
  await dialog.getByRole('button', { name: 'Open App settings' }).click();
  await expect(page.getByLabel('OpenRouter API key')).toHaveValue('sk-or-test');
  expect(await projectCount(page)).toBe(0);
});

test('running out of credit is explained', async ({ page }) => {
  await stubOpenRouter(page, { failingStatus: 402 });
  await useAssistantSettings(page);
  await describeSite(page);
  await expect(page.getByRole('dialog').getByRole('alert')).toHaveText(
    'This OpenRouter key does not have enough credit for the request.',
  );
});

test('cancelling leaves the project list unchanged', async ({ page }) => {
  const stub = await stubOpenRouter(page, { hasQuestions: true });
  await useAssistantSettings(page);
  await describeSite(page);
  const questions = page.getByRole('dialog', { name: 'A few quick questions' });
  await questions.getByRole('button', { name: 'Cancel' }).click();
  await expect(page.locator('dialog[open]')).toHaveCount(0);
  expect(stub.steps).toEqual(['site_clarification']);
  expect(await projectCount(page)).toBe(0);
});
