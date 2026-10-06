import type { Project } from '../../app/types';

const MILLISECONDS_PER_SECOND = 1000;
const MINUTE = 60;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;
const MONTH = 30 * DAY;
const YEAR = 365 * DAY;

const TIME_UNITS: { unit: Intl.RelativeTimeFormatUnit; seconds: number }[] = [
  { unit: 'year', seconds: YEAR },
  { unit: 'month', seconds: MONTH },
  { unit: 'week', seconds: WEEK },
  { unit: 'day', seconds: DAY },
  { unit: 'hour', seconds: HOUR },
  { unit: 'minute', seconds: MINUTE },
];

export function withTitle(project: Project, title: string): Project {
  return { ...project, settings: { ...project.settings, title } };
}

export function duplicateProject(project: Project, newId: string): Project {
  const renamed = withTitle(project, `Copy of ${project.settings.title}`);
  return { ...renamed, id: newId };
}

export function formatLastEdit(updatedAt: string, now: number): string {
  const elapsedSeconds = (Date.parse(updatedAt) - now) / MILLISECONDS_PER_SECOND;
  const format = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  for (const { unit, seconds } of TIME_UNITS) {
    if (Math.abs(elapsedSeconds) >= seconds) {
      return format.format(Math.round(elapsedSeconds / seconds), unit);
    }
  }
  return 'just now';
}
