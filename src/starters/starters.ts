import { copyProjectWithNewIds } from '../app/projectCopy';
import type { Project } from '../app/types';
import { parseProjectDocument } from '../persistence/validateProject';

export type StarterInfo = {
  id: string;
  name: string;
  description: string;
  presetId: string;
  load(): Promise<unknown>;
};

export const STARTERS: StarterInfo[] = [
  {
    id: 'saas',
    name: 'SaaS product',
    description: 'A product site with features, pricing, about and contact pages.',
    presetId: 'clean',
    load: () => import('./saas/project.json'),
  },
  {
    id: 'mobile-app',
    name: 'Mobile app launch',
    description: 'Launch an app with features, download links and reviews.',
    presetId: 'playful',
    load: () => import('./mobile-app/project.json'),
  },
  {
    id: 'waitlist',
    name: 'Startup waitlist',
    description: 'One page that collects early access sign-ups.',
    presetId: 'midnight',
    load: () => import('./waitlist/project.json'),
  },
];

function moduleDefault(value: unknown): unknown {
  if (typeof value === 'object' && value !== null && 'default' in value) return value.default;
  return value;
}

export async function loadStarter(starter: StarterInfo): Promise<Project> {
  const loaded = await starter.load();
  return parseProjectDocument(moduleDefault(loaded));
}

export function instantiateStarter(starter: StarterInfo, project: Project, title: string): Project {
  const copy = copyProjectWithNewIds(project, title);
  return { ...copy, starterId: starter.id };
}
