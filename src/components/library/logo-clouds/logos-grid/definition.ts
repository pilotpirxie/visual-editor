import type { ComponentDefinition, ImageValue } from '../../../types';

function logo(company: string): ImageValue {
  return {
    source: 'placeholder',
    src: '',
    alt: company,
    decorative: false,
    width: 1200,
    height: 800,
    placeholder: { ratio: '3:2', subject: 'logo' },
  };
}

export const definition: ComponentDefinition = {
  id: 'logos-grid',
  version: 1,
  name: 'Logo cloud, grid with heading',
  category: 'logo-clouds',
  description: 'A heading and short text beside a grid of logos in tiles.',
  tags: ['logos', 'customers', 'partners', 'integrations', 'grid'],
  fieldGroups: ['Heading', 'Logos'],
  styleOverrides: ['--color-background', '--color-text', '--section-padding-y'],
  fields: [
    {
      name: 'title',
      label: 'Title',
      type: 'text',
      default: 'Works with the tools your team already uses',
      required: true,
      group: 'Heading',
    },
    {
      name: 'text',
      label: 'Text',
      type: 'textarea',
      default:
        'Bring recordings in from your video calls and send insights out to where decisions are made.',
      group: 'Heading',
    },
    {
      name: 'logos',
      label: 'Logos',
      type: 'list',
      group: 'Logos',
      minItems: 1,
      maxItems: 12,
      itemLabel: 'company',
      itemFields: [
        { name: 'company', label: 'Company', type: 'text', default: 'Company' },
        { name: 'image', label: 'Logo', type: 'image', default: logo('Company logo') },
      ],
      default: [
        { company: 'Video calls', image: logo('Video call app') },
        { company: 'Calendar', image: logo('Calendar app') },
        { company: 'Team chat', image: logo('Team chat app') },
        { company: 'Issue tracker', image: logo('Issue tracker') },
        { company: 'Docs', image: logo('Docs app') },
        { company: 'Design tool', image: logo('Design tool') },
      ],
    },
  ],
};
