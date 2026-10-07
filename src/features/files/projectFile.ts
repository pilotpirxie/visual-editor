import { slugify } from '../../app/slugs';
import type { Project } from '../../app/types';
import type { ProjectSummary } from '../../persistence/db';
import { parseProjectDocument, ProjectFormatError } from '../../persistence/validateProject';

export const PROJECT_FILE_EXTENSION = '.json';

export const PROJECT_FILE_TYPE = 'application/json';

export type OpenDecision = 'open' | 'replace-or-copy' | 'copy-only';

export function projectFileName(project: Project): string {
  return `${slugify(project.settings.title)}${PROJECT_FILE_EXTENSION}`;
}

export function serializeProject(project: Project): string {
  return `${JSON.stringify(project, null, 2)}\n`;
}

export function parseProjectFile(text: string): Project {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch (error) {
    throw new ProjectFormatError('This file is not a project file', { cause: error });
  }
  return parseProjectDocument(data);
}

export function openDecision(
  existing: ProjectSummary | null,
  fileModifiedAt: number,
): OpenDecision {
  if (existing === null) return 'open';
  const isFileNewer = fileModifiedAt > Date.parse(existing.updatedAt);
  return isFileNewer ? 'replace-or-copy' : 'copy-only';
}
