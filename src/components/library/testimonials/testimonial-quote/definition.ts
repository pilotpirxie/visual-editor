import type { ComponentDefinition } from '../../../types';

export const definition: ComponentDefinition = {
  id: 'testimonial-quote',
  version: 1,
  name: 'Testimonial, large quote',
  category: 'testimonials',
  description: 'One customer quote in large type with a photo, name and role.',
  tags: ['testimonial', 'quote', 'review', 'customer', 'social proof'],
  fieldGroups: ['Quote', 'Person'],
  styleOverrides: ['--color-background', '--color-text', '--section-padding-y'],
  fields: [
    {
      name: 'quote',
      label: 'Quote',
      type: 'textarea',
      default:
        'We used to lose half of what customers told us in scattered notes. With Fieldnote, the whole team works from the same evidence, and our roadmap debates got a lot shorter.',
      required: true,
      group: 'Quote',
    },
    { name: 'name', label: 'Name', type: 'text', default: 'Priya Natarajan', group: 'Person' },
    {
      name: 'role',
      label: 'Role and company',
      type: 'text',
      default: 'Head of Product, Lumen Health',
      group: 'Person',
    },
    {
      name: 'photo',
      label: 'Photo',
      type: 'image',
      default: {
        source: 'placeholder',
        src: '',
        alt: 'Priya Natarajan',
        decorative: false,
        width: 1200,
        height: 1200,
        placeholder: { ratio: '1:1', subject: 'person' },
      },
      group: 'Person',
    },
  ],
};
