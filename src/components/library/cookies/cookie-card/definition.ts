import type { ComponentDefinition } from '../../../types';

export const definition: ComponentDefinition = {
  id: 'cookie-card',
  version: 1,
  name: 'Cookies, corner card',
  category: 'cookies',
  description:
    'A small consent card in the corner of the screen. It remembers the visitor’s choice and stays hidden afterwards.',
  tags: ['cookies', 'consent', 'privacy', 'gdpr', 'card', 'corner'],
  fieldGroups: ['Message', 'Buttons'],
  behaviors: ['consent'],
  styleOverrides: ['--color-background', '--color-text'],
  fields: [
    {
      name: 'title',
      label: 'Title',
      type: 'text',
      default: 'Cookies, your call',
      group: 'Message',
    },
    {
      name: 'text',
      label: 'Text',
      type: 'textarea',
      default:
        'We use a few cookies to keep you signed in and to learn which pages are useful. Nothing is shared with advertisers.',
      required: true,
      maxLength: 240,
      group: 'Message',
    },
    {
      name: 'showPolicyLink',
      label: 'Show policy link',
      type: 'boolean',
      default: true,
      group: 'Message',
    },
    {
      name: 'policyLabel',
      label: 'Policy link label',
      type: 'text',
      default: 'Read the cookie policy',
      visibleWhen: { field: 'showPolicyLink', equals: true },
      group: 'Message',
    },
    {
      name: 'policyLink',
      label: 'Policy link',
      type: 'link',
      default: { type: 'page', newTab: false },
      visibleWhen: { field: 'showPolicyLink', equals: true },
      group: 'Message',
    },
    {
      name: 'acceptLabel',
      label: 'Accept button',
      type: 'text',
      default: 'Accept all',
      required: true,
      group: 'Buttons',
    },
    {
      name: 'showDecline',
      label: 'Show decline button',
      type: 'boolean',
      default: true,
      group: 'Buttons',
    },
    {
      name: 'declineLabel',
      label: 'Decline button',
      type: 'text',
      default: 'Only essential',
      visibleWhen: { field: 'showDecline', equals: true },
      group: 'Buttons',
    },
  ],
};
