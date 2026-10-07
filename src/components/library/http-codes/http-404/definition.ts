import type { ComponentDefinition } from '../../../types';

export const definition: ComponentDefinition = {
  id: 'http-404',
  version: 1,
  name: 'HTTP code, 404 not found',
  category: 'http-codes',
  description:
    'The main content of a “page not found” page. Name the page 404 so it exports as 404.html.',
  tags: ['404', 'not found', 'error', 'missing', 'page'],
  fieldGroups: ['Content', 'Buttons'],
  styleOverrides: ['--color-background', '--color-text', '--section-padding-y'],
  fields: [
    { name: 'eyebrow', label: 'Code', type: 'text', default: '404', group: 'Content' },
    {
      name: 'title',
      label: 'Title',
      type: 'text',
      default: 'We can’t find that page',
      required: true,
      group: 'Content',
    },
    {
      name: 'text',
      label: 'Text',
      type: 'textarea',
      default:
        'The page may have moved, or the link may be out of date. Start again from the home page, or tell us what you were looking for.',
      group: 'Content',
    },
    {
      name: 'button',
      label: 'Button',
      type: 'button',
      default: {
        label: 'Back to the home page',
        link: { type: 'url', url: 'index.html', newTab: false },
        variant: 'primary',
      },
      group: 'Buttons',
    },
    {
      name: 'showSecondaryButton',
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
        label: 'Email support',
        link: { type: 'email', url: 'support@fieldnote.app', newTab: false },
        variant: 'secondary',
      },
      visibleWhen: { field: 'showSecondaryButton', equals: true },
      group: 'Buttons',
    },
  ],
};
