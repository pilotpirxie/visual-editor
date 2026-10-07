import type { ComponentDefinition, ImageValue, LinkValue } from '../../../types';

type StoreBadge = { icon: string; smallLabel: string; label: string; link: LinkValue };

function screenshot(alt: string): ImageValue {
  return {
    source: 'placeholder',
    src: '',
    alt,
    decorative: false,
    width: 900,
    height: 1200,
    placeholder: { ratio: '3:4', subject: 'screenshot' },
  };
}

function storeBadge(icon: string, smallLabel: string, label: string, url: string): StoreBadge {
  return { icon, smallLabel, label, link: { type: 'url', url, newTab: true } };
}

export const definition: ComponentDefinition = {
  id: 'app-badges',
  version: 1,
  name: 'Applications, app store badges',
  category: 'applications',
  description: 'A heading, short pitch and app store download badges next to a phone screenshot.',
  tags: ['app', 'mobile', 'download', 'app store', 'google play', 'badges', 'phone'],
  fieldGroups: ['Heading', 'Badges', 'Screenshot'],
  styleOverrides: ['--color-background', '--color-text', '--section-padding-y'],
  fields: [
    { name: 'eyebrow', label: 'Eyebrow', type: 'text', default: 'Mobile app', group: 'Heading' },
    {
      name: 'title',
      label: 'Title',
      type: 'text',
      default: 'Take Fieldnote to your next customer visit',
      required: true,
      maxLength: 120,
      group: 'Heading',
    },
    {
      name: 'text',
      label: 'Text',
      type: 'textarea',
      default:
        'Record interviews in person, mark highlights as they happen and find every session synced to your team’s workspace. Included in every plan.',
      group: 'Heading',
    },
    {
      name: 'badges',
      label: 'Download badges',
      type: 'list',
      group: 'Badges',
      minItems: 1,
      maxItems: 3,
      itemLabel: 'label',
      itemFields: [
        {
          name: 'icon',
          label: 'Store logo',
          type: 'icon',
          default: 'simple-icons:apple',
          iconPurpose: 'brand',
        },
        { name: 'smallLabel', label: 'Small label', type: 'text', default: 'Download on the' },
        { name: 'label', label: 'Store name', type: 'text', default: 'App Store' },
        {
          name: 'link',
          label: 'Link',
          type: 'link',
          default: { type: 'url', url: '#', newTab: true },
        },
      ],
      default: [
        storeBadge('simple-icons:apple', 'Download on the', 'App Store', 'https://apps.apple.com'),
        storeBadge(
          'simple-icons:googleplay',
          'Get it on',
          'Google Play',
          'https://play.google.com',
        ),
      ],
    },
    {
      name: 'rating',
      label: 'Rating',
      type: 'text',
      default: '4.8 · 12,000 ratings',
      group: 'Badges',
    },
    {
      name: 'screenshot',
      label: 'Screenshot',
      type: 'image',
      default: screenshot('The Fieldnote app showing tagged highlights from a customer interview'),
      group: 'Screenshot',
    },
  ],
};
