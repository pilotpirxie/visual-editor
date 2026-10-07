import type { ComponentDefinition, ImageValue } from '../../../types';

function person(alt: string): ImageValue {
  return {
    source: 'placeholder',
    src: '',
    alt,
    decorative: false,
    width: 1200,
    height: 1200,
    placeholder: { ratio: '1:1', subject: 'person' },
  };
}

export const definition: ComponentDefinition = {
  id: 'testimonials-carousel',
  version: 1,
  name: 'Testimonials, carousel',
  category: 'testimonials',
  description: 'A heading and customer quotes that scroll sideways, with buttons and dots.',
  tags: ['testimonials', 'quotes', 'reviews', 'carousel', 'slider'],
  fieldGroups: ['Heading', 'Quotes'],
  styleOverrides: ['--color-background', '--color-text', '--section-padding-y'],
  behaviors: ['carousel'],
  fields: [
    { name: 'eyebrow', label: 'Eyebrow', type: 'text', default: 'Customers', group: 'Heading' },
    {
      name: 'title',
      label: 'Title',
      type: 'text',
      default: 'Research teams that stopped losing what customers said',
      required: true,
      group: 'Heading',
    },
    {
      name: 'items',
      label: 'Quotes',
      type: 'list',
      group: 'Quotes',
      minItems: 1,
      maxItems: 12,
      itemLabel: 'name',
      itemFields: [
        { name: 'quote', label: 'Quote', type: 'textarea', default: 'What the customer said.' },
        { name: 'name', label: 'Name', type: 'text', default: 'Name' },
        { name: 'role', label: 'Role and company', type: 'text', default: 'Role, Company' },
        { name: 'photo', label: 'Photo', type: 'image', default: person('Portrait') },
      ],
      default: [
        {
          quote:
            'We ran forty interviews for the onboarding redesign. Fieldnote had the themes ready before our synthesis workshop even started.',
          name: 'Priya Raman',
          role: 'Head of Research, Copperline',
          photo: person('Priya Raman'),
        },
        {
          quote:
            'Engineers used to skim our research decks. Now they watch two-minute reels and ask for the next one.',
          name: 'Jonas Becker',
          role: 'Product Director, Freightly',
          photo: person('Jonas Becker'),
        },
        {
          quote:
            'Customer success tags every churn call now. Product sees the same quotes the same week, not next quarter.',
          name: 'Amara Osei',
          role: 'VP Customer Success, Tilda Health',
          photo: person('Amara Osei'),
        },
        {
          quote:
            'Single sign-on, EU data residency and an audit log. Our security review took one meeting.',
          name: 'Hannah Wright',
          role: 'IT Lead, Mosaic Bank',
          photo: person('Hannah Wright'),
        },
      ],
    },
  ],
};
