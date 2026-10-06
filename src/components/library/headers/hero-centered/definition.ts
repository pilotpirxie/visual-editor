import type { ComponentDefinition } from '../../../types';

export const definition: ComponentDefinition = {
  id: 'hero-centered',
  version: 1,
  name: 'Hero, centered text',
  category: 'headers',
  description: 'Page heading with a short pitch and up to two buttons, centered.',
  tags: ['hero', 'heading', 'intro', 'buttons'],
  fieldGroups: ['Heading', 'Buttons'],
  styleOverrides: ['--color-background', '--color-text', '--section-padding-y'],
  fields: [
    {
      name: 'eyebrow',
      label: 'Eyebrow',
      type: 'text',
      default: 'Customer research for product teams',
      group: 'Heading',
    },
    {
      name: 'title',
      label: 'Title',
      type: 'text',
      default: 'Turn customer calls into decisions your team can ship',
      required: true,
      maxLength: 120,
      group: 'Heading',
    },
    {
      name: 'text',
      label: 'Text',
      type: 'textarea',
      default:
        'Fieldnote records, transcribes and tags every interview, so what you heard on Monday is in Tuesday’s sprint planning.',
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
        label: 'Watch the 2-minute demo',
        link: { type: 'url', url: '#', newTab: false },
        variant: 'secondary',
      },
      visibleWhen: { field: 'showSecondary', equals: true },
      group: 'Buttons',
    },
  ],
};
