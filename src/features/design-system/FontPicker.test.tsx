import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fontSet } from '../../app/projectSlice';
import { dispatch, store } from '../../app/store';
import { changeValue, click, getButton, render, runInAct } from '../../test/dom';
import { loadIntoAppStore } from '../../test/fixtures';
import { FontPicker } from './FontPicker';

vi.mock('../../persistence/db', () => ({
  putProject: vi.fn(async () => {}),
  getProject: vi.fn(async () => null),
  listProjects: vi.fn(async () => []),
  deleteProject: vi.fn(async () => {}),
}));

vi.mock('./fontList', async (importOriginal) => {
  const original = await importOriginal<typeof import('./fontList')>();
  return {
    ...original,
    loadFontList: vi.fn(async () => [
      { family: 'Inter', category: 'sans-serif', weights: [100, 400, 700, 900] },
      { family: 'Lora', category: 'serif', weights: [400, 500, 700] },
      { family: 'Bebas Neue', category: 'display', weights: [400] },
    ]),
  };
});

function fonts() {
  return store.getState().project.designSystem.fonts;
}

async function renderPicker() {
  const rendered = render(<FontPicker role="heading" label="Heading font" />);
  await vi.waitFor(() =>
    expect(getButton(rendered.container, 'Change heading font').disabled).toBe(false),
  );
  return rendered;
}

beforeEach(() => {
  loadIntoAppStore();
  document.head.querySelectorAll('link[data-font-preview]').forEach((link) => link.remove());
});

describe('FontPicker', () => {
  it('shows the system font until a family is chosen', async () => {
    const { container } = await renderPicker();
    expect(container.querySelector('.ve-font-current')?.textContent).toBe('System font');
  });

  it('lists families in their own font and filters them by name and category', async () => {
    const { container } = await renderPicker();
    click(getButton(container, 'Change heading font'));
    const options = [...container.querySelectorAll<HTMLButtonElement>('.ve-font-option')];
    expect(options.map((option) => option.textContent)).toEqual(['Inter', 'Lora', 'Bebas Neue']);
    expect(options[1].style.fontFamily).toContain('Lora');
    changeValue(container.querySelector('[aria-label="Font category"]'), 'serif');
    expect(container.querySelectorAll('.ve-font-option')).toHaveLength(1);
    changeValue(container.querySelector('[aria-label="Font category"]'), '');
    changeValue(container.querySelector('input[type="search"]'), 'beb');
    expect(container.querySelector('.ve-font-option')?.textContent).toBe('Bebas Neue');
  });

  it('picks a family with its regular and bold weights and closes the list', async () => {
    const { container } = await renderPicker();
    click(getButton(container, 'Change heading font'));
    click(getButton(container, 'Lora'));
    expect(fonts()).toEqual([{ role: 'heading', family: 'Lora', weights: [400, 700] }]);
    expect(store.getState().project.designSystem.tokens['--font-heading'].value).toBe(
      '"Lora", ui-serif, Georgia, serif',
    );
    expect(container.querySelector('.ve-font-browser')).toBeNull();
    expect(document.head.querySelector('link[data-font-preview="Lora"]')).not.toBeNull();
  });

  it('falls back to the only weight a family has', async () => {
    const { container } = await renderPicker();
    click(getButton(container, 'Change heading font'));
    click(getButton(container, 'Bebas Neue'));
    expect(fonts()[0].weights).toEqual([400]);
  });

  it('toggles the weights to load but always keeps one', async () => {
    const { container } = await renderPicker();
    runInAct(() =>
      dispatch(
        fontSet({
          role: 'heading',
          selection: { family: 'Inter', weights: [400] },
          stack: '"Inter", sans-serif',
        }),
      ),
    );
    const weight = (value: number) =>
      [...container.querySelectorAll<HTMLInputElement>('.ve-font-weight input')].find(
        (input) => input.parentElement?.textContent === String(value),
      );
    expect(weight(400)?.disabled).toBe(true);
    click(weight(900) ?? null);
    expect(fonts()[0].weights).toEqual([400, 900]);
    click(weight(400) ?? null);
    expect(fonts()[0].weights).toEqual([900]);
  });

  it('goes back to the system font', async () => {
    const { container } = await renderPicker();
    runInAct(() =>
      dispatch(
        fontSet({
          role: 'heading',
          selection: { family: 'Inter', weights: [400] },
          stack: '"Inter", sans-serif',
        }),
      ),
    );
    click(getButton(container, 'Use system font'));
    expect(fonts()).toEqual([]);
  });
});
