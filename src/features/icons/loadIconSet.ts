import type { IconSetData } from '../../../packages/icon-data/src/convert';
import { registerIconSet } from '../../render/icons';

const ICON_SET_LOADERS: Record<string, () => Promise<{ default: IconSetData }>> = {
  lucide: () => import('virtual:icon-set/lucide'),
  remix: () => import('virtual:icon-set/remix'),
  tabler: () => import('virtual:icon-set/tabler'),
  phosphor: () => import('virtual:icon-set/phosphor'),
  heroicons: () => import('virtual:icon-set/heroicons'),
  'material-symbols': () => import('virtual:icon-set/material-symbols'),
  iconoir: () => import('virtual:icon-set/iconoir'),
  'simple-icons': () => import('virtual:icon-set/simple-icons'),
};

export function isIconSetLoaded(name: string): boolean {
  return loadedSets.has(name);
}

const loadingSets = new Map<string, Promise<void>>();

const loadedSets = new Set<string>();

async function fetchAndRegister(name: string): Promise<void> {
  const load = ICON_SET_LOADERS[name];
  if (load === undefined) throw new Error(`Unknown icon set "${name}"`);
  try {
    const module = await load();
    registerIconSet(name, module.default);
    loadedSets.add(name);
  } catch (error) {
    throw new Error(`Could not load the ${name} icon set`, { cause: error });
  }
}

export async function loadIconSet(name: string): Promise<void> {
  const existing = loadingSets.get(name);
  if (existing !== undefined) return existing;
  const loading = fetchAndRegister(name);
  loadingSets.set(name, loading);
  try {
    await loading;
  } catch (error) {
    loadingSets.delete(name);
    throw error;
  }
}
