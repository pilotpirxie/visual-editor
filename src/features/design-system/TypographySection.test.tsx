import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createSampleProject } from '../../app/projectFactory';
import { store } from '../../app/store';
import { changeValue, click, getButton, render } from '../../test/dom';
import { loadIntoAppStore, withSystemFonts } from '../../test/fixtures';
import { loadFontList } from './fontList';
import { TypographySection } from './TypographySection';

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

function designSystem() {
  return store.getState().project.designSystem;
}

function fontButton(container: HTMLElement, role: 'heading' | 'body'): HTMLButtonElement {
  const button = container.querySelector<HTMLButtonElement>(`#ve-font-${role}`);
  if (button === null) throw new Error(`No ${role} font button`);
  return button;
}

function select(container: HTMLElement, id: string): HTMLSelectElement {
  const element = container.querySelector<HTMLSelectElement>(`select#${CSS.escape(id)}`);
  if (element === null) throw new Error(`No select ${id}`);
  return element;
}

function optionValues(element: HTMLSelectElement): string[] {
  const values: string[] = [];
  for (const option of element.options) values.push(option.value);
  return values;
}

async function renderSection(): Promise<HTMLDivElement> {
  const { container } = render(<TypographySection />);
  await vi.waitFor(() => expect(fontButton(container, 'heading').disabled).toBe(false));
  return container;
}

async function pickHeadingFont(container: HTMLElement, family: string): Promise<void> {
  click(fontButton(container, 'heading'));
  click(getButton(container, family));
}

beforeEach(() => {
  loadIntoAppStore(withSystemFonts(createSampleProject()));
  document.head.querySelectorAll('link[data-font-preview]').forEach((link) => link.remove());
});

describe('TypographySection fonts', () => {
  it('shows the system font for headings and body until a family is chosen', async () => {
    const container = await renderSection();
    expect(fontButton(container, 'heading').textContent).toBe('System font');
    expect(fontButton(container, 'body').textContent).toBe('System font');
  });

  it('lists the system font first, then families in their own font, filtered by name and category', async () => {
    const container = await renderSection();
    click(fontButton(container, 'heading'));
    const options = [...container.querySelectorAll<HTMLButtonElement>('.ve-font-option')];
    expect(options.map((option) => option.textContent)).toEqual([
      'System font',
      'Inter',
      'Lora',
      'Bebas Neue',
    ]);
    expect(options[2]?.style.fontFamily).toContain('Lora');
    changeValue(container.querySelector('[aria-label="Font category"]'), 'serif');
    expect(container.querySelectorAll('.ve-font-option')).toHaveLength(2);
    changeValue(container.querySelector('[aria-label="Font category"]'), '');
    changeValue(container.querySelector('input[type="search"]'), 'beb');
    expect(container.querySelectorAll('.ve-font-option')[1]?.textContent).toBe('Bebas Neue');
  });

  it('picks a family, loads only the heading weight and closes the list', async () => {
    const container = await renderSection();
    await pickHeadingFont(container, 'Lora');
    expect(designSystem().fonts).toEqual([{ role: 'heading', family: 'Lora', weights: [700] }]);
    expect(designSystem().tokens['--font-heading']?.value).toBe('"Lora", ui-serif, Georgia, serif');
    expect(container.querySelector('.ve-font-browser')).toBeNull();
    expect(document.head.querySelector('link[data-font-preview="Lora"]')).not.toBeNull();
  });

  it('moves the heading weight to the only weight a family has', async () => {
    const container = await renderSection();
    await pickHeadingFont(container, 'Bebas Neue');
    expect(designSystem().tokens['--font-weight-heading']?.value).toBe('400');
    expect(designSystem().fonts[0]?.weights).toEqual([400]);
  });

  it('goes back to the system font', async () => {
    const container = await renderSection();
    await pickHeadingFont(container, 'Lora');
    await pickHeadingFont(container, 'System font');
    expect(designSystem().fonts).toEqual([]);
  });
});

describe('TypographySection weights and sizes', () => {
  it('offers only the weights the chosen family has and loads the picked one', async () => {
    const container = await renderSection();
    await pickHeadingFont(container, 'Inter');
    const weight = select(container, 've-token---font-weight-heading');
    expect(optionValues(weight)).toEqual(['100', '400', '700', '900']);
    expect(weight.options[3]?.textContent).toBe('900 Black');
    changeValue(weight, '900');
    expect(designSystem().tokens['--font-weight-heading']?.value).toBe('900');
    expect(designSystem().fonts[0]?.weights).toEqual([900]);
  });

  it('sets the body weight and the bold weight separately', async () => {
    const container = await renderSection();
    changeValue(select(container, 've-token---font-weight-regular'), '300');
    changeValue(select(container, 've-token---font-weight-bold'), '800');
    expect(designSystem().tokens['--font-weight-regular']?.value).toBe('300');
    expect(designSystem().tokens['--font-weight-bold']?.value).toBe('800');
  });

  it('keeps an out-of-range line height as a draft with an error', async () => {
    const container = await renderSection();
    const lineHeight = container.querySelector<HTMLInputElement>(
      `#${CSS.escape('ve-token---line-height-tight')}`,
    );
    changeValue(lineHeight, '9');
    expect(designSystem().tokens['--line-height-tight']?.value).toBe('1.15');
    expect(container.querySelector('[role="alert"]')?.textContent).toBe('Use 0.8 to 3');
    changeValue(lineHeight, '1.3');
    expect(designSystem().tokens['--line-height-tight']?.value).toBe('1.3');
  });

  it('rebuilds the text sizes from the base size and the scale', async () => {
    const container = await renderSection();
    changeValue(container.querySelector('#ve-type-base'), '18');
    changeValue(select(container, 've-type-ratio'), '1.5');
    expect(designSystem().generators).toMatchObject({ typeBasePx: 18, typeRatio: 1.5 });
    expect(designSystem().tokens['--text-base']?.value).toBe('1.125rem');
  });

  it('explains when the font list cannot be loaded and keeps the font buttons disabled', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(loadFontList).mockRejectedValueOnce(new Error('Offline'));
    const { container } = render(<TypographySection />);
    await vi.waitFor(() =>
      expect(container.querySelector('[role="alert"]')?.textContent).toContain('Offline'),
    );
    expect(fontButton(container, 'heading').disabled).toBe(true);
  });
});
