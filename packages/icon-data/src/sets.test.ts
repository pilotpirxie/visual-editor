import { describe, expect, it } from 'vitest';
import { ICON_SET_INFO, iconSetInfo } from './sets';

describe('iconSetInfo', () => {
  it('finds a set by its id', () => {
    const lucide = iconSetInfo('lucide');
    expect(lucide?.label).toBe('Lucide');
    expect(lucide?.packageName).toBe('@iconify-json/lucide');
  });

  it('finds sets whose id differs from their Iconify package name', () => {
    expect(iconSetInfo('remix')?.packageName).toBe('@iconify-json/ri');
    expect(iconSetInfo('phosphor')?.packageName).toBe('@iconify-json/ph');
  });

  it('returns undefined for an unknown id', () => {
    expect(iconSetInfo('font-awesome')).toBeUndefined();
  });

  it('does not match a package name or a label instead of an id', () => {
    expect(iconSetInfo('ri')).toBeUndefined();
    expect(iconSetInfo('Lucide')).toBeUndefined();
    expect(iconSetInfo('')).toBeUndefined();
  });
});

describe('ICON_SET_INFO', () => {
  it('bundles the eight sets from the PRD', () => {
    const ids: string[] = [];
    for (const info of ICON_SET_INFO) ids.push(info.id);
    expect(ids).toEqual([
      'lucide',
      'remix',
      'tabler',
      'phosphor',
      'heroicons',
      'material-symbols',
      'iconoir',
      'simple-icons',
    ]);
  });

  it('gives every set a unique id and package', () => {
    const ids = new Set<string>();
    const packages = new Set<string>();
    for (const info of ICON_SET_INFO) {
      ids.add(info.id);
      packages.add(info.packageName);
    }
    expect(ids.size).toBe(ICON_SET_INFO.length);
    expect(packages.size).toBe(ICON_SET_INFO.length);
  });

  it('marks only Simple Icons as brand-only', () => {
    const brandOnly: string[] = [];
    for (const info of ICON_SET_INFO) {
      if (info.isBrandOnly) brandOnly.push(info.id);
    }
    expect(brandOnly).toEqual(['simple-icons']);
  });

  it('loads only Material Symbols on demand', () => {
    const onDemand: string[] = [];
    for (const info of ICON_SET_INFO) {
      if (info.isOnDemand) onDemand.push(info.id);
    }
    expect(onDemand).toEqual(['material-symbols']);
  });

  it('records the stricter Remix Icon license rather than Apache 2.0', () => {
    expect(iconSetInfo('remix')?.license).toBe('Remix Icon License v1.0');
  });

  it('gives every set a license name and an https license link', () => {
    for (const info of ICON_SET_INFO) {
      expect(info.license, info.id).not.toBe('');
      expect(info.licenseUrl, info.id).toMatch(/^https:\/\//);
    }
  });

  it('starts fallback styles with the unsuffixed default style', () => {
    for (const info of ICON_SET_INFO) {
      if (info.fallbackStyles === undefined) continue;
      expect(info.fallbackStyles[0]?.suffix, info.id).toBe('');
    }
  });
});
