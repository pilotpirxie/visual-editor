import type { ComponentDefinition } from '../../../types';

export const definition: ComponentDefinition = {
  id: 'cta-image',
  version: 1,
  name: 'Call to action, with image',
  category: 'call-to-action',
  description: 'A closing pitch with two buttons in a card next to an image.',
  tags: ['cta', 'image', 'download', 'signup', 'card'],
  fieldGroups: ['Content', 'Image'],
  styleOverrides: ['--color-background', '--color-text', '--section-padding-y'],
  fields: [
    {
      name: 'title',
      label: 'Title',
      type: 'text',
      default: 'Take your research with you',
      required: true,
      group: 'Content',
    },
    {
      name: 'text',
      label: 'Text',
      type: 'textarea',
      default:
        'Record in-person interviews from your phone and find them tagged on your laptop an hour later.',
      group: 'Content',
    },
    {
      name: 'primaryButton',
      label: 'Primary button',
      type: 'button',
      default: {
        label: 'Download for iPhone',
        link: { type: 'url', url: '#', newTab: false },
        variant: 'primary',
      },
      group: 'Content',
    },
    {
      name: 'showSecondary',
      label: 'Show second button',
      type: 'boolean',
      default: true,
      group: 'Content',
    },
    {
      name: 'secondaryButton',
      label: 'Second button',
      type: 'button',
      default: {
        label: 'Get it on Android',
        link: { type: 'url', url: '#', newTab: false },
        variant: 'secondary',
      },
      visibleWhen: { field: 'showSecondary', equals: true },
      group: 'Content',
    },
    {
      name: 'image',
      label: 'Image',
      type: 'image',
      default: {
        source: 'placeholder',
        src: '',
        alt: 'The Fieldnote phone app recording an interview',
        decorative: false,
        width: 1200,
        height: 1200,
        placeholder: { ratio: '1:1', subject: 'product' },
      },
      group: 'Image',
    },
  ],
};
