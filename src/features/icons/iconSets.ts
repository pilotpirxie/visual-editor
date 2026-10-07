import { ICON_SET_INFO, type IconSetInfo } from '../../../packages/icon-data/src/sets';
import type { Field } from '../../components/types';

const LOGO_EXCLUDED_SETS = new Set(['remix', 'simple-icons']);

export function allowedIconSets(field: Pick<Field, 'iconPurpose'>): IconSetInfo[] {
  const allowed: IconSetInfo[] = [];
  for (const info of ICON_SET_INFO) {
    if (field.iconPurpose === 'logo' && LOGO_EXCLUDED_SETS.has(info.id)) continue;
    if (field.iconPurpose !== 'brand' && info.isBrandOnly) continue;
    allowed.push(info);
  }
  return allowed;
}

export function defaultIconSets(): IconSetInfo[] {
  return ICON_SET_INFO.filter((info) => !info.isBrandOnly);
}
