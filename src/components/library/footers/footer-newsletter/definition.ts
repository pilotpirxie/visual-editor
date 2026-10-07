import type { ComponentDefinition, Field, LinkValue } from '../../../types';

type FooterLink = { label: string; link: LinkValue };

type SocialLink = { label: string; icon: string; link: LinkValue };

const HASH: LinkValue = { type: 'url', url: '#', newTab: false };

function linkList(name: string, label: string, group: string, links: FooterLink[]): Field {
  return {
    name,
    label,
    type: 'list',
    group,
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

function socialLink(label: string, icon: string, url: string): SocialLink {
  return { label, icon, link: { type: 'url', url, newTab: true } };
}

export const definition: ComponentDefinition = {
  id: 'footer-newsletter',
  version: 1,
  name: 'Footer, with newsletter',
  category: 'footers',
  description: 'Logo and description, two link columns, a newsletter form and a legal line.',
  tags: ['footer', 'newsletter', 'email', 'subscribe', 'links', 'social', 'legal'],
  fieldGroups: ['Brand', 'Newsletter', 'Columns', 'Social', 'Legal'],
  styleOverrides: ['--color-background', '--color-text', '--section-padding-y'],
  fields: [
    {
      name: 'logoIcon',
      label: 'Logo icon',
      type: 'icon',
      default: 'lucide:audio-lines',
      iconPurpose: 'logo',
      group: 'Brand',
    },
    {
      name: 'description',
      label: 'Description',
      type: 'textarea',
      default:
        'Customer research your whole team can use. Record, transcribe and tag interviews in one place.',
      group: 'Brand',
    },
    {
      name: 'newsletterTitle',
      label: 'Newsletter title',
      type: 'text',
      default: 'Get field notes by email',
      group: 'Newsletter',
    },
    {
      name: 'newsletterText',
      label: 'Newsletter text',
      type: 'textarea',
      default: 'One email a month with interview tips and product news. Unsubscribe any time.',
      group: 'Newsletter',
    },
    {
      name: 'emailLabel',
      label: 'Email field label',
      type: 'text',
      default: 'Email address',
      required: true,
      group: 'Newsletter',
    },
    {
      name: 'emailPlaceholder',
      label: 'Email placeholder',
      type: 'text',
      default: 'you@company.com',
      group: 'Newsletter',
    },
    {
      name: 'buttonLabel',
      label: 'Button label',
      type: 'text',
      default: 'Subscribe',
      required: true,
      group: 'Newsletter',
    },
    {
      name: 'formAction',
      label: 'Form action URL',
      type: 'text',
      default: '',
      group: 'Newsletter',
    },
    {
      name: 'formMethod',
      label: 'Method',
      type: 'select',
      default: 'post',
      options: [
        { value: 'post', label: 'POST' },
        { value: 'get', label: 'GET' },
      ],
      group: 'Newsletter',
    },
    {
      name: 'firstTitle',
      label: 'First column title',
      type: 'text',
      default: 'Product',
      group: 'Columns',
    },
    linkList('firstLinks', 'First column links', 'Columns', [
      { label: 'Features', link: { type: 'section', anchor: 'features', newTab: false } },
      { label: 'Pricing', link: { type: 'section', anchor: 'pricing', newTab: false } },
      { label: 'Integrations', link: HASH },
      { label: 'Changelog', link: HASH },
    ]),
    {
      name: 'secondTitle',
      label: 'Second column title',
      type: 'text',
      default: 'Company',
      group: 'Columns',
    },
    linkList('secondLinks', 'Second column links', 'Columns', [
      { label: 'About', link: HASH },
      { label: 'Customers', link: HASH },
      { label: 'Careers', link: HASH },
      { label: 'Contact', link: { type: 'email', url: 'hello@fieldnote.example', newTab: false } },
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
        socialLink('LinkedIn', 'simple-icons:linkedin', 'https://www.linkedin.com'),
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
    linkList('legalLinks', 'Legal links', 'Legal', [
      { label: 'Privacy policy', link: HASH },
      { label: 'Terms of service', link: HASH },
    ]),
  ],
};
