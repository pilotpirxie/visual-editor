import type { ComponentDefinition } from '../../../types';

export const definition: ComponentDefinition = {
  id: 'footer-simple',
  version: 1,
  name: 'Footer, simple',
  category: 'footers',
  description: 'Site name with a tagline, a row of links and a copyright line.',
  tags: ['footer', 'links', 'copyright', 'legal'],
  fieldGroups: ['Brand', 'Links', 'Legal'],
  styleOverrides: ['--color-background', '--color-text', '--section-padding-y'],
  fields: [
    {
      name: 'tagline',
      label: 'Tagline',
      type: 'textarea',
      default: 'Customer research that keeps up with your roadmap.',
      group: 'Brand',
    },
    {
      name: 'links',
      label: 'Links',
      type: 'list',
      group: 'Links',
      minItems: 0,
      maxItems: 10,
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
        { label: 'Privacy', link: { type: 'url', url: '#', newTab: false } },
        { label: 'Terms', link: { type: 'url', url: '#', newTab: false } },
        { label: 'Status', link: { type: 'url', url: '#', newTab: false } },
        { label: 'Contact', link: { type: 'email', url: 'hello@example.com', newTab: false } },
      ],
    },
    {
      name: 'copyright',
      label: 'Copyright',
      type: 'text',
      default: '© 2026 Fieldnote Labs. All rights reserved.',
      group: 'Legal',
    },
  ],
};
