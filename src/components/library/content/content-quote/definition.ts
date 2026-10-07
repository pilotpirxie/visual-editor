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
  id: 'content-quote',
  version: 1,
  name: 'Content, quote block',
  category: 'content',
  description: 'A large centered pull quote with an attribution and an optional photo.',
  tags: ['content', 'quote', 'pull quote', 'blockquote', 'statement', 'mission'],
  fieldGroups: ['Quote', 'Attribution'],
  styleOverrides: ['--color-background', '--color-text', '--section-padding-y'],
  fields: [
    {
      name: 'showIcon',
      label: 'Show quote icon',
      type: 'boolean',
      default: true,
      group: 'Quote',
    },
    {
      name: 'quoteIcon',
      label: 'Quote icon',
      type: 'icon',
      default: 'quote',
      visibleWhen: { field: 'showIcon', equals: true },
      group: 'Quote',
    },
    {
      name: 'quote',
      label: 'Quote',
      type: 'textarea',
      default:
        'Research is not the report. It is the moment an engineer hears a customer struggle and says: I can fix that by Friday.',
      required: true,
      group: 'Quote',
    },
    { name: 'name', label: 'Name', type: 'text', default: 'Priya Raman', group: 'Attribution' },
    {
      name: 'role',
      label: 'Role',
      type: 'text',
      default: 'Co-founder and CEO, Fieldnote',
      group: 'Attribution',
    },
    {
      name: 'showPhoto',
      label: 'Show photo',
      type: 'boolean',
      default: true,
      group: 'Attribution',
    },
    {
      name: 'photo',
      label: 'Photo',
      type: 'image',
      default: person('Priya Raman'),
      visibleWhen: { field: 'showPhoto', equals: true },
      group: 'Attribution',
    },
  ],
};
