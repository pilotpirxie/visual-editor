import type { ComponentDefinition } from '../../../types';

export const definition: ComponentDefinition = {
  id: 'hero-background',
  version: 1,
  name: 'Hero, background image',
  category: 'headers',
  description: 'Page heading, a short pitch and buttons over a full-width background image.',
  tags: ['hero', 'heading', 'background', 'image', 'photo', 'cover', 'intro'],
  fieldGroups: ['Heading', 'Buttons', 'Image', 'Layout'],
  styleOverrides: ['--color-background', '--color-text', '--section-padding-y'],
  fields: [
    {
      name: 'eyebrow',
      label: 'Eyebrow',
      type: 'text',
      default: 'Used by 900 product teams',
      group: 'Heading',
    },
    {
      name: 'title',
      label: 'Title',
      type: 'text',
      default: 'Turn customer interviews into decisions your team trusts',
      required: true,
      maxLength: 120,
      group: 'Heading',
    },
    {
      name: 'text',
      label: 'Text',
      type: 'textarea',
      default:
        'Fieldnote records, transcribes and tags every call, so your roadmap quotes real customers instead of hunches.',
      group: 'Heading',
    },
    {
      name: 'primaryButton',
      label: 'Primary button',
      type: 'button',
      default: {
        label: 'Start free trial',
        link: { type: 'url', url: '#', newTab: false },
        variant: 'primary',
      },
      group: 'Buttons',
    },
    {
      name: 'showSecondary',
      label: 'Show second button',
      type: 'boolean',
      default: true,
      group: 'Buttons',
    },
    {
      name: 'secondaryButton',
      label: 'Second button',
      type: 'button',
      default: {
        label: 'See how it works',
        link: { type: 'section', anchor: 'how-it-works', newTab: false },
        variant: 'secondary',
      },
      visibleWhen: { field: 'showSecondary', equals: true },
      group: 'Buttons',
    },
    {
      name: 'image',
      label: 'Background image',
      type: 'image',
      default: {
        source: 'placeholder',
        src: '',
        alt: 'A product team gathered around a screen, watching a customer interview clip',
        decorative: false,
        width: 1200,
        height: 675,
        placeholder: { ratio: '16:9', subject: 'photo' },
      },
      group: 'Image',
    },
    {
      name: 'align',
      label: 'Text alignment',
      type: 'segmented',
      default: 'left',
      group: 'Layout',
      options: [
        { value: 'left', label: 'Left', icon: 'align-left' },
        { value: 'center', label: 'Center', icon: 'align-center' },
      ],
    },
  ],
};
