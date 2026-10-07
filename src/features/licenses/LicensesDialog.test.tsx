import { describe, expect, it, vi } from 'vitest';
import { ICON_SET_INFO } from '../../../packages/icon-data/src/sets';
import { click, getButton, render } from '../../test/dom';
import { LicensesDialog } from './LicensesDialog';

function sectionOf(container: HTMLElement, label: string): HTMLDetailsElement {
  for (const section of container.querySelectorAll('details')) {
    if (section.querySelector('summary')?.textContent?.startsWith(`${label} ·`)) return section;
  }
  throw new Error(`No license section for ${label}`);
}

describe('LicensesDialog', () => {
  it('lists every bundled icon set with its license name and link', () => {
    const { container } = render(<LicensesDialog onClose={() => {}} />);
    const summaries: string[] = [];
    for (const summary of container.querySelectorAll('details summary')) {
      summaries.push(summary.textContent ?? '');
    }
    const expected: string[] = [];
    for (const info of ICON_SET_INFO) expected.push(`${info.label} · ${info.license}`);
    expect(summaries).toEqual(expected);
    for (const info of ICON_SET_INFO) {
      const link = sectionOf(container, info.label).querySelector('a');
      expect(link?.getAttribute('href')).toBe(info.licenseUrl);
      expect(link?.getAttribute('rel')).toBe('noopener noreferrer');
    }
  });

  it('shows the full license text of a set', async () => {
    const { container } = render(<LicensesDialog onClose={() => {}} />);
    const lucide = sectionOf(container, 'Lucide');
    await vi.waitFor(() =>
      expect(lucide.querySelector('.ve-license-text')?.textContent).toMatch(/^ISC License/),
    );
  });

  it('shows a loading message until the text arrives', () => {
    const { container } = render(<LicensesDialog onClose={() => {}} />);
    expect(sectionOf(container, 'Tabler Icons').textContent).toContain('Loading the license…');
  });

  it('explains when a license text cannot be loaded and keeps the others', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.resetModules();
    vi.doMock('./texts/remix.txt?raw', () => {
      throw new Error('The license file is offline');
    });
    const fresh = await import('./LicensesDialog');
    const { container } = render(<fresh.LicensesDialog onClose={() => {}} />);
    const remix = sectionOf(container, 'Remix Icon');
    await vi.waitFor(() =>
      expect(remix.textContent).toContain('The license text could not be loaded.'),
    );
    await vi.waitFor(() =>
      expect(sectionOf(container, 'Lucide').querySelector('.ve-license-text')).not.toBeNull(),
    );
    vi.doUnmock('./texts/remix.txt?raw');
  });

  it('credits Google Fonts', () => {
    const { container } = render(<LicensesDialog onClose={() => {}} />);
    const fontsLink = container.querySelector('a[href="https://fonts.google.com/attribution"]');
    expect(fontsLink).not.toBeNull();
  });

  it('closes with Close', () => {
    const onClose = vi.fn();
    const { container } = render(<LicensesDialog onClose={onClose} />);
    click(getButton(container, 'Close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
