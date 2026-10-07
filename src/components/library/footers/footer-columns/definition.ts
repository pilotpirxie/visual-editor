import type { ComponentDefinition, Field, LinkValue } from '../../../types';

type FooterLink = { label: string; link: LinkValue };

const HASH: LinkValue = { type: 'url', url: '#', newTab: false };

function linkList(name: string, label: string, links: FooterLink[]): Field {
  return {
    name,
    label,
    type: 'list',
    group: 'Columns',
    minItems: 0,
    maxItems: 8,
    itemLabel: 'label',
    itemFields: [
      { name: 'label', label: 'Label', type: 'text', default: 'Link' },
      { name: 'link', label: 'Link', type: 'link', default: HASH },
    ],
    default: links,
  };
}

function socialLink(
  label: string,
  icon: string,
  url: string,
): { label: string; icon: string; link: LinkValue } {
  return { label, icon, link: { type: 'url', url, newTab: true } };
}

export const definition: ComponentDefinition = {
  id: 'footer-columns',
  version: 1,
  name: 'Footer, link columns',
  category: 'footers',
  description: 'Logo, tagline and social links with three columns of links and a legal line.',
  tags: ['footer', 'links', 'columns', 'sitemap', 'social'],
  fieldGroups: ['Brand', 'Columns', 'Social', 'Legal'],
  styleOverrides: ['--color-background', '--color-text', '--section-padding-y'],
  fields: [
    {
      name: 'tagline',
      label: 'Tagline',
      type: 'textarea',
      default: 'Customer research your whole team can use.',
      group: 'Brand',
    },
    {
      name: 'productTitle',
      label: 'First column title',
      type: 'text',
      default: 'Product',
      group: 'Columns',
    },
    linkList('productLinks', 'First column links', [
      { label: 'Features', link: { type: 'section', anchor: 'features', newTab: false } },
      { label: 'Pricing', link: { type: 'section', anchor: 'pricing', newTab: false } },
      { label: 'Integrations', link: HASH },
      { label: 'Changelog', link: HASH },
    ]),
    {
      name: 'companyTitle',
      label: 'Second column title',
      type: 'text',
      default: 'Company',
      group: 'Columns',
    },
    linkList('companyLinks', 'Second column links', [
      { label: 'About', link: HASH },
      { label: 'Careers', link: HASH },
      { label: 'Contact', link: { type: 'email', url: 'hello@fieldnote.example', newTab: false } },
    ]),
    {
      name: 'resourcesTitle',
      label: 'Third column title',
      type: 'text',
      default: 'Resources',
      group: 'Columns',
    },
    linkList('resourcesLinks', 'Third column links', [
      { label: 'Research guide', link: HASH },
      { label: 'Interview templates', link: HASH },
      { label: 'Help center', link: HASH },
    ]),
    {
      name: 'socials',
      label: 'Social links',
      type: 'list',
      group: 'Social',
      minItems: 0,
      maxItems: 6,
      itemLabel: 'label',
      itemFields: [
        { name: 'label', label: 'Name', type: 'text', default: 'Social network' },
        { name: 'icon', label: 'Icon', type: 'icon', default: 'globe', iconPurpose: 'brand' },
        {
          name: 'link',
          label: 'Link',
          type: 'link',
          default: { type: 'url', url: '#', newTab: true },
        },
      ],
      default: [
        socialLink('GitHub', 'simple-icons:github', 'https://github.com'),
        socialLink('Bluesky', 'simple-icons:bluesky', 'https://bsky.app'),
        socialLink('YouTube', 'simple-icons:youtube', 'https://www.youtube.com'),
      ],
    },
    {
      name: 'copyright',
      label: 'Legal line',
      type: 'text',
      default: '© 2026 Fieldnote Inc. All rights reserved.',
      group: 'Legal',
    },
  ],
};
