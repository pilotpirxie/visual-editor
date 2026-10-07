import type { IconStyle } from './convert.ts';

export type IconSetInfo = {
  id: string;
  packageName: string;
  label: string;
  license: string;
  licenseUrl: string;
  isBrandOnly: boolean;
  isOnDemand: boolean;
  fallbackStyles?: IconStyle[];
};

export const ICON_SET_INFO: IconSetInfo[] = [
  {
    id: 'lucide',
    packageName: '@iconify-json/lucide',
    label: 'Lucide',
    license: 'ISC',
    licenseUrl: 'https://github.com/lucide-icons/lucide/blob/main/LICENSE',
    isBrandOnly: false,
    isOnDemand: false,
  },
  {
    id: 'remix',
    packageName: '@iconify-json/ri',
    label: 'Remix Icon',
    license: 'Remix Icon License v1.0',
    licenseUrl: 'https://github.com/Remix-Design/remixicon/blob/master/License',
    isBrandOnly: false,
    isOnDemand: false,
  },
  {
    id: 'tabler',
    packageName: '@iconify-json/tabler',
    label: 'Tabler Icons',
    license: 'MIT',
    licenseUrl: 'https://github.com/tabler/tabler-icons/blob/main/LICENSE',
    isBrandOnly: false,
    isOnDemand: false,
    fallbackStyles: [
      { suffix: '', label: 'Outline' },
      { suffix: 'filled', label: 'Filled' },
    ],
  },
  {
    id: 'phosphor',
    packageName: '@iconify-json/ph',
    label: 'Phosphor',
    license: 'MIT',
    licenseUrl: 'https://github.com/phosphor-icons/core/blob/main/LICENSE',
    isBrandOnly: false,
    isOnDemand: false,
  },
  {
    id: 'heroicons',
    packageName: '@iconify-json/heroicons',
    label: 'Heroicons',
    license: 'MIT',
    licenseUrl: 'https://github.com/tailwindlabs/heroicons/blob/master/LICENSE',
    isBrandOnly: false,
    isOnDemand: false,
  },
  {
    id: 'material-symbols',
    packageName: '@iconify-json/material-symbols',
    label: 'Material Symbols',
    license: 'Apache 2.0',
    licenseUrl: 'https://github.com/google/material-design-icons/blob/master/LICENSE',
    isBrandOnly: false,
    isOnDemand: true,
  },
  {
    id: 'iconoir',
    packageName: '@iconify-json/iconoir',
    label: 'Iconoir',
    license: 'MIT',
    licenseUrl: 'https://github.com/iconoir-icons/iconoir/blob/main/LICENSE',
    isBrandOnly: false,
    isOnDemand: false,
    fallbackStyles: [
      { suffix: '', label: 'Regular' },
      { suffix: 'solid', label: 'Solid' },
    ],
  },
  {
    id: 'simple-icons',
    packageName: '@iconify-json/simple-icons',
    label: 'Simple Icons',
    license: 'CC0 1.0',
    licenseUrl: 'https://github.com/simple-icons/simple-icons/blob/develop/LICENSE.md',
    isBrandOnly: true,
    isOnDemand: false,
  },
];

export function iconSetInfo(id: string): IconSetInfo | undefined {
  return ICON_SET_INFO.find((info) => info.id === id);
}
