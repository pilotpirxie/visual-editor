import type { ComponentDefinition } from '../../../types';

export const definition: ComponentDefinition = {
  id: 'nav-simple',
  version: 1,
  name: 'Navigation, logo left',
  category: 'navigations',
  description:
    'Site name on the left, links and a button on the right; a menu button below 1024 px.',
  tags: ['menu', 'navbar', 'header', 'links'],
  fieldGroups: ['Links', 'Button', 'Menu'],
  styleOverrides: ['--color-background', '--color-text'],
  behaviors: ['menu'],
  fields: [
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
        { label: 'Features', link: { type: 'section', anchor: 'features', newTab: false } },
        { label: 'Pricing', link: { type: 'section', anchor: 'pricing', newTab: false } },
        { label: 'Customers', link: { type: 'section', anchor: 'customers', newTab: false } },
        { label: 'Docs', link: { type: 'url', url: '#', newTab: false } },
      ],
    },
    { name: 'showCta', label: 'Show button', type: 'boolean', default: true, group: 'Button' },
    {
      name: 'cta',
      label: 'Button',
      type: 'button',
      default: {
        label: 'Start free trial',
        link: { type: 'url', url: '#', newTab: false },
        variant: 'primary',
      },
      visibleWhen: { field: 'showCta', equals: true },
      group: 'Button',
    },
    { name: 'menuIcon', label: 'Menu icon', type: 'icon', default: 'menu', group: 'Menu' },
  ],
};
