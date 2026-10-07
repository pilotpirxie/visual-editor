import { copyProjectWithNewIds } from '../app/projectCopy';
import type { Project } from '../app/types';
import { openProjectDocument } from '../persistence/migrations';

export const STARTER_USE_CASES = [
  { id: 'products', label: 'Products' },
  { id: 'services', label: 'Services' },
  { id: 'personal', label: 'Personal' },
  { id: 'local', label: 'Local and events' },
] as const;

export type StarterUseCase = (typeof STARTER_USE_CASES)[number]['id'];

export type StarterInfo = {
  id: string;
  name: string;
  description: string;
  presetId: string;
  useCase: StarterUseCase;
  load(): Promise<unknown>;
};

export const STARTERS: StarterInfo[] = [
  {
    id: 'saas',
    name: 'SaaS product',
    description: 'A product site with features, pricing, about and contact pages.',
    presetId: 'clean',
    useCase: 'products',
    load: () => import('./saas/project.json'),
  },
  {
    id: 'mobile-app',
    name: 'Mobile app launch',
    description: 'Launch an app with features, download links and reviews.',
    presetId: 'playful',
    useCase: 'products',
    load: () => import('./mobile-app/project.json'),
  },
  {
    id: 'waitlist',
    name: 'Startup waitlist',
    description: 'One page that collects early access sign-ups.',
    presetId: 'midnight',
    useCase: 'products',
    load: () => import('./waitlist/project.json'),
  },
  {
    id: 'agency',
    name: 'Agency',
    description: 'A studio site with services, selected work, the team and a contact form.',
    presetId: 'editorial',
    useCase: 'services',
    load: () => import('./agency/project.json'),
  },
  {
    id: 'portfolio',
    name: 'Portfolio',
    description: 'A personal site for a designer or photographer: projects, about and contact.',
    presetId: 'mono',
    useCase: 'personal',
    load: () => import('./portfolio/project.json'),
  },
  {
    id: 'event',
    name: 'Event or conference',
    description: 'A conference site with the schedule, the speakers and tickets.',
    presetId: 'bold',
    useCase: 'local',
    load: () => import('./event/project.json'),
  },
  {
    id: 'restaurant',
    name: 'Restaurant or cafe',
    description: 'A neighborhood restaurant with its menu, its story and table booking.',
    presetId: 'warm',
    useCase: 'local',
    load: () => import('./restaurant/project.json'),
  },
  {
    id: 'consultant',
    name: 'Consultant or coach',
    description: 'A practice site with services, client stories and a booking form.',
    presetId: 'corporate',
    useCase: 'services',
    load: () => import('./consultant/project.json'),
  },
];

function moduleDefault(value: unknown): unknown {
  if (typeof value === 'object' && value !== null && 'default' in value) return value.default;
  return value;
}

export async function loadStarter(starter: StarterInfo): Promise<Project> {
  const loaded = await starter.load();
  return openProjectDocument(moduleDefault(loaded));
}

export function instantiateStarter(starter: StarterInfo, project: Project, title: string): Project {
  const copy = copyProjectWithNewIds(project, title);
  return { ...copy, starterId: starter.id };
}
