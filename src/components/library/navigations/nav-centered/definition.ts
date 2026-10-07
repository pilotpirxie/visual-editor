import type { ComponentDefinition } from '../../../types';

export const definition: ComponentDefinition = {
  id: 'nav-centered',
  version: 1,
  name: 'Navigation, centered logo',
  category: 'navigations',
  description: 'Logo in the middle with links underneath on wide screens; a menu button on phones.',
  tags: ['menu', 'navbar', 'header', 'centered', 'brand'],
  fieldGroups: ['Logo', 'Links', 'Menu'],
  styleOverrides: ['--color-background', '--color-text'],
  behaviors: ['menu'],
  fields: [
    {
      name: 'logoIcon',
      label: 'Logo icon',
      type: 'icon',
      default: 'lucide:audio-lines',
      iconPurpose: 'logo',
      group: 'Logo',
    },
    {
      name: 'links',
      label: 'Links',
      type: 'list',
      group: 'Links',
      minItems: 0,
      maxItems: 8,
      itemLabel: 'label',
      itemFields: [
        { name: 'label', label: 'Label', type: 'text', default: 'Link' },
        {
          name: 'link',
          label: 'Link',
          type: 'link',
          default: { type: 'url', url: '#', newTab: false },
        },
      ],
      default: [
        { label: 'How it works', link: { type: 'section', anchor: 'how-it-works', newTab: false } },
        { label: 'Features', link: { type: 'section', anchor: 'features', newTab: false } },
        { label: 'Pricing', link: { type: 'section', anchor: 'pricing', newTab: false } },
        { label: 'FAQ', link: { type: 'section', anchor: 'faq', newTab: false } },
        { label: 'Contact', link: { type: 'section', anchor: 'contact', newTab: false } },
      ],
    },
    { name: 'menuIcon', label: 'Menu icon', type: 'icon', default: 'menu', group: 'Menu' },
  ],
};
