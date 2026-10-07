import type { ComponentDefinition } from '../../../types';

export const definition: ComponentDefinition = {
  id: 'banner-promo',
  version: 1,
  name: 'Banner, dismissible promo',
  category: 'banners',
  description: 'A slim promotion strip with a button and a close button. Works without JavaScript.',
  tags: ['promo', 'banner', 'offer', 'sale', 'discount', 'dismiss', 'close'],
  fieldGroups: ['Message', 'Button'],
  styleOverrides: ['--color-background', '--color-text'],
  fields: [
    {
      name: 'label',
      label: 'Label',
      type: 'text',
      default: 'Offer',
      maxLength: 24,
      group: 'Message',
    },
    {
      name: 'text',
      label: 'Text',
      type: 'text',
      default: 'Yearly Team plans are 20% off until October 31, for new and existing workspaces.',
      required: true,
      maxLength: 140,
      group: 'Message',
    },
    { name: 'showButton', label: 'Show button', type: 'boolean', default: true, group: 'Button' },
    {
      name: 'button',
      label: 'Button',
      type: 'button',
      default: {
        label: 'See plans',
        link: { type: 'section', anchor: 'pricing', newTab: false },
        variant: 'primary',
      },
      visibleWhen: { field: 'showButton', equals: true },
      group: 'Button',
    },
  ],
};
