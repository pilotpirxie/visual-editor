import { describe, expect, it } from 'vitest';
import { playbookText } from './sitePlaybooks';

describe('playbookText', () => {
  const lines = playbookText().split('\n');

  it('describes each kind of site on one line with its pages and its home page', () => {
    expect(lines.length).toBeGreaterThanOrEqual(20);
    for (const line of lines) {
      expect(line).toMatch(/^- [A-Z][^.]+ \([^)]+\)\. Pages: [^.]+\. Home page: .+\.$/);
    }
  });

  it('covers the kinds people ask for most', () => {
    const text = playbookText();
    for (const word of ['hairdresser', 'dentist', 'plumber', 'charity', 'course', 'ebook']) {
      expect(text).toContain(word);
    }
  });

  it('uses no long dashes', () => {
    expect(playbookText()).not.toMatch(/[\u2013\u2014]/);
  });
});
