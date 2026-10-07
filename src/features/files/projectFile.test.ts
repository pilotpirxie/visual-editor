import { describe, expect, it } from 'vitest';
import { createSampleProject } from '../../app/projectFactory';
import { openDecision, parseProjectFile, projectFileName, serializeProject } from './projectFile';

describe('project files', () => {
  it('round-trips a project through file text unchanged', () => {
    const project = createSampleProject();
    expect(parseProjectFile(serializeProject(project))).toEqual(project);
  });

  it('names the file after the site title', () => {
    const project = createSampleProject();
    project.settings.title = 'Acme Research & Co';
    expect(projectFileName(project)).toBe('acme-research-co.json');
  });

  it('explains that text which is not JSON is not a project file', () => {
    expect(() => parseProjectFile('<html>')).toThrow('This file is not a project file');
  });
});

describe('openDecision', () => {
  const summary = { id: 'p', title: 'Acme', updatedAt: '2026-10-07T10:00:00.000Z' };

  it('opens a project the browser does not have yet', () => {
    expect(openDecision(null, 0)).toBe('open');
  });

  it('offers to replace only when the file is newer than the browser copy', () => {
    expect(openDecision(summary, Date.parse('2026-10-07T11:00:00.000Z'))).toBe('replace-or-copy');
    expect(openDecision(summary, Date.parse('2026-10-07T09:00:00.000Z'))).toBe('copy-only');
  });
});
