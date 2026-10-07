import { describe, expect, it } from 'vitest';
import type { IconSetInfo } from '../../../packages/icon-data/src/sets';
import { allowedIconSets, defaultIconSets } from './iconSets';

const NON_BRAND_SETS = [
  'lucide',
  'remix',
  'tabler',
  'phosphor',
  'heroicons',
  'material-symbols',
  'iconoir',
];

function idsOf(sets: IconSetInfo[]): string[] {
  const ids: string[] = [];
  for (const info of sets) ids.push(info.id);
  return ids;
}

describe('allowedIconSets', () => {
  it('offers every set except brand logos for a field with no purpose', () => {
    expect(idsOf(allowedIconSets({}))).toEqual(NON_BRAND_SETS);
  });

  it('never offers Remix Icon or Simple Icons for a logo field', () => {
    expect(idsOf(allowedIconSets({ iconPurpose: 'logo' }))).toEqual([
      'lucide',
      'tabler',
      'phosphor',
      'heroicons',
      'material-symbols',
      'iconoir',
    ]);
  });

  it('offers every set, including brand logos, for a brand field', () => {
    expect(idsOf(allowedIconSets({ iconPurpose: 'brand' }))).toEqual([
      ...NON_BRAND_SETS,
      'simple-icons',
    ]);
  });

  it('keeps the order of the bundled set list', () => {
    const ids = idsOf(allowedIconSets({ iconPurpose: 'brand' }));
    expect(ids[0]).toBe('lucide');
    expect(ids.at(-1)).toBe('simple-icons');
  });
});

describe('defaultIconSets', () => {
  it('lists every set that can be a site default, without brand logos', () => {
    expect(idsOf(defaultIconSets())).toEqual(NON_BRAND_SETS);
  });

  it('includes no brand-only set', () => {
    for (const info of defaultIconSets()) expect(info.isBrandOnly).toBe(false);
  });
});
