import type { ComponentDefinition } from '../../../types';

export const definition: ComponentDefinition = {
  id: 'cta-banner',
  version: 1,
  name: 'Call to action, banner strip',
  category: 'call-to-action',
  description: 'A colored strip with one line of text and a button.',
  tags: ['cta', 'banner', 'strip', 'signup', 'trial'],
  fieldGroups: ['Content'],
  styleOverrides: ['--color-primary', '--color-primary-contrast', '--section-padding-y'],
  fields: [
    {
      name: 'title',
      label: 'Title',
      type: 'text',
      default: 'Run your next five interviews with Fieldnote, free',
      required: true,
      group: 'Content',
    },
    {
      name: 'text',
      label: 'Text',
      type: 'text',
      default: 'Set up in ten minutes. No credit card needed.',
      group: 'Content',
    },
    {
      name: 'button',
      label: 'Button',
      type: 'button',
      default: {
        label: 'Start free trial',
        link: { type: 'url', url: '#', newTab: false },
        variant: 'secondary',
      },
      group: 'Content',
    },
  ],
};
