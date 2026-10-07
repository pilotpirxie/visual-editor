import type { ComponentDefinition } from '../../../types';

const PLACEHOLDER_LINK = { type: 'url', url: '#', newTab: false };

export const definition: ComponentDefinition = {
  id: 'nav-dropdown',
  version: 1,
  name: 'Navigation, with dropdown menus',
  category: 'navigations',
  description:
    'Site name, links that can open a dropdown of sub-links, and a button; a menu button below 1024 px.',
  tags: ['menu', 'navbar', 'header', 'dropdown', 'submenu', 'mega menu'],
  fieldGroups: ['Links', 'Button', 'Menu'],
  styleOverrides: ['--color-background', '--color-text'],
  behaviors: ['menu', 'dropdown'],
  fields: [
    {
      name: 'links',
      label: 'Links',
      type: 'list',
      group: 'Links',
      minItems: 0,
      maxItems: 6,
      itemLabel: 'label',
      itemFields: [
        { name: 'label', label: 'Label', type: 'text', default: 'Link' },
        { name: 'link', label: 'Link', type: 'link', default: PLACEHOLDER_LINK },
        {
          name: 'children',
          label: 'Dropdown links',
          type: 'list',
          minItems: 0,
          maxItems: 8,
          itemLabel: 'label',
          itemFields: [
            { name: 'label', label: 'Label', type: 'text', default: 'Sub-link' },
            { name: 'link', label: 'Link', type: 'link', default: PLACEHOLDER_LINK },
          ],
          default: [],
        },
      ],
      default: [
        {
          label: 'Product',
          link: PLACEHOLDER_LINK,
          children: [
            { label: 'Interview recorder', link: PLACEHOLDER_LINK },
            { label: 'Theme board', link: PLACEHOLDER_LINK },
            { label: 'Highlight reels', link: PLACEHOLDER_LINK },
            { label: 'Integrations', link: PLACEHOLDER_LINK },
          ],
        },
        {
          label: 'Teams',
          link: PLACEHOLDER_LINK,
          children: [
            { label: 'Product managers', link: PLACEHOLDER_LINK },
            { label: 'UX researchers', link: PLACEHOLDER_LINK },
            { label: 'Customer success', link: PLACEHOLDER_LINK },
          ],
        },
        {
          label: 'Pricing',
          link: { type: 'section', anchor: 'pricing', newTab: false },
          children: [],
        },
        { label: 'Docs', link: PLACEHOLDER_LINK, children: [] },
      ],
    },
    { name: 'showCta', label: 'Show button', type: 'boolean', default: true, group: 'Button' },
    {
      name: 'cta',
      label: 'Button',
      type: 'button',
      default: { label: 'Start free trial', link: PLACEHOLDER_LINK, variant: 'primary' },
      visibleWhen: { field: 'showCta', equals: true },
      group: 'Button',
    },
    { name: 'menuIcon', label: 'Menu icon', type: 'icon', default: 'menu', group: 'Menu' },
  ],
};
