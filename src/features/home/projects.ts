import type { Project } from '../../app/types';

const TIME_UNITS: { unit: Intl.RelativeTimeFormatUnit; seconds: number }[] = [
  { unit: 'year', seconds: 365 * 24 * 60 * 60 },
  { unit: 'month', seconds: 30 * 24 * 60 * 60 },
  { unit: 'week', seconds: 7 * 24 * 60 * 60 },
  { unit: 'day', seconds: 24 * 60 * 60 },
  { unit: 'hour', seconds: 60 * 60 },
  { unit: 'minute', seconds: 60 },
];

export function withTitle(project: Project, title: string): Project {
  return { ...project, settings: { ...project.settings, title } };
}

export function duplicateProject(project: Project, newId: string): Project {
  return { ...withTitle(project, `Copy of ${project.settings.title}`), id: newId };
}

export function formatLastEdit(updatedAt: string, now: number): string {
  const elapsedSeconds = (Date.parse(updatedAt) - now) / 1000;
  const format = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  for (const { unit, seconds } of TIME_UNITS) {
    if (Math.abs(elapsedSeconds) >= seconds) {
      return format.format(Math.round(elapsedSeconds / seconds), unit);
    }
  }
  return 'just now';
}
