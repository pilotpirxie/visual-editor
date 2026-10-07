import type { ComponentDefinition } from '../../../types';

export const definition: ComponentDefinition = {
  id: 'contact-cards',
  version: 1,
  name: 'Contact, cards',
  category: 'contacts',
  description: 'A heading and cards for each way to reach your team.',
  tags: ['contact', 'cards', 'support', 'sales', 'press'],
  fieldGroups: ['Heading', 'Cards'],
  styleOverrides: ['--color-background', '--color-text', '--section-padding-y'],
  fields: [
    { name: 'eyebrow', label: 'Eyebrow', type: 'text', default: 'Get in touch', group: 'Heading' },
    {
      name: 'title',
      label: 'Title',
      type: 'text',
      default: 'We are here to help',
      required: true,
      group: 'Heading',
    },
    {
      name: 'cards',
      label: 'Cards',
      type: 'list',
      group: 'Cards',
      minItems: 1,
      maxItems: 6,
      itemLabel: 'title',
      itemFields: [
        { name: 'icon', label: 'Icon', type: 'icon', default: 'mail' },
        { name: 'title', label: 'Title', type: 'text', default: 'Title' },
        {
          name: 'text',
          label: 'Text',
          type: 'textarea',
          default: 'Who should get in touch this way.',
        },
        {
          name: 'link',
          label: 'Link',
          type: 'button',
          default: {
            label: 'Write to us',
            link: { type: 'url', url: '#', newTab: false },
            variant: 'ghost',
          },
        },
      ],
      default: [
        {
          icon: 'message',
          title: 'Sales',
          text: 'Questions about plans, pilots or a security review.',
          link: {
            label: 'sales@fieldnote.example',
            link: { type: 'email', url: 'sales@fieldnote.example', newTab: false },
            variant: 'ghost',
          },
        },
        {
          icon: 'support',
          title: 'Support',
          text: 'Help with your account, recordings or integrations.',
          link: {
            label: 'support@fieldnote.example',
            link: { type: 'email', url: 'support@fieldnote.example', newTab: false },
            variant: 'ghost',
          },
        },
        {
          icon: 'phone',
          title: 'Phone',
          text: 'Weekdays from 9:00 to 17:00 Eastern time.',
          link: {
            label: '+1 416 555 0142',
            link: { type: 'phone', url: '+14165550142', newTab: false },
            variant: 'ghost',
          },
        },
      ],
    },
  ],
};
