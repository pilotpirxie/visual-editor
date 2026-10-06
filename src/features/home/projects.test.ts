import { describe, expect, it } from 'vitest';
import { createSampleProject } from '../../app/projectFactory';
import { duplicateProject, formatLastEdit, withTitle } from './projects';

describe('project helpers', () => {
  it('renames without touching anything else', () => {
    const project = createSampleProject();
    const renamed = withTitle(project, 'Acme');
    expect(renamed.settings.title).toBe('Acme');
    expect(renamed.pages).toBe(project.pages);
    expect(project.settings.title).toBe('Fieldnote');
  });

  it('duplicates under a new id and a "Copy of" title', () => {
    const project = createSampleProject();
    const copy = duplicateProject(project, 'copy-id');
    expect(copy.id).toBe('copy-id');
    expect(copy.settings.title).toBe('Copy of Fieldnote');
    expect(copy.blocks).toEqual(project.blocks);
  });

  it.each([
    [10, 'just now'],
    [5 * 60, '5 minutes ago'],
    [3 * 60 * 60, '3 hours ago'],
    [26 * 60 * 60, 'yesterday'],
    [15 * 24 * 60 * 60, '2 weeks ago'],
  ])('formats an edit %i seconds ago as "%s"', (secondsAgo, expected) => {
    const now = Date.parse('2026-10-06T12:00:00Z');
    const updatedAt = new Date(now - secondsAgo * 1000).toISOString();
    expect(formatLastEdit(updatedAt, now)).toBe(expected);
  });
});
