import { beforeAll, describe, expect, it } from 'vitest';
import { ICON_SET_INFO } from '../../packages/icon-data/src/sets';
import { loadIconSet } from '../features/icons/loadIconSet';
import { resolveIcon, semanticIconIn, semanticIconNames } from './icons';

const DEFAULT_SETS = ICON_SET_INFO.filter((info) => !info.isBrandOnly).map((info) => info.id);

beforeAll(async () => {
  for (const set of DEFAULT_SETS) await loadIconSet(set);
}, 60_000);

describe('semantic icon names', () => {
  it('cover about a hundred everyday icons', () => {
    expect(semanticIconNames().length).toBeGreaterThanOrEqual(100);
  });

  it.each(DEFAULT_SETS)('all resolve to a real icon in %s', (set) => {
    const missing: string[] = [];
    for (const name of semanticIconNames()) {
      const icon = resolveIcon(name, set);
      if (icon?.set !== set || icon.name !== semanticIconIn(name, set)) missing.push(name);
    }
    expect(missing).toEqual([]);
  });
});
