import type { IconSetData } from '../../../packages/icon-data/src/convert';
import { registerIconSet } from '../../render/icons';

const ICON_SET_LOADERS: Record<string, () => Promise<{ default: IconSetData }>> = {
  lucide: () => import('virtual:icon-set/lucide'),
};

const loadingSets = new Map<string, Promise<void>>();

async function fetchAndRegister(name: string): Promise<void> {
  const load = ICON_SET_LOADERS[name];
  if (load === undefined) throw new Error(`Unknown icon set "${name}"`);
  try {
    const module = await load();
    registerIconSet(name, module.default);
  } catch (error) {
    loadingSets.delete(name);
    throw new Error(`Could not load the ${name} icon set`, { cause: error });
  }
}

export function loadIconSet(name: string): Promise<void> {
  const existing = loadingSets.get(name);
  if (existing !== undefined) return existing;
  const loading = fetchAndRegister(name);
  loadingSets.set(name, loading);
  return loading;
}
