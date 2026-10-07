import type { ComponentDefinition, ImageValue } from '../../../types';

function portrait(alt: string): ImageValue {
  return {
    source: 'placeholder',
    src: '',
    alt,
    decorative: false,
    width: 900,
    height: 1200,
    placeholder: { ratio: '3:4', subject: 'person' },
  };
}

type Person = { photo: ImageValue; name: string; role: string };

function person(name: string, role: string): Person {
  return { photo: portrait(name), name, role };
}

export const definition: ComponentDefinition = {
  id: 'team-grid',
  version: 1,
  name: 'Team, photo grid',
  category: 'team',
  description: 'A heading, a short intro and a grid of photos with names and roles.',
  tags: ['team', 'people', 'about', 'photos', 'speakers', 'grid'],
  fieldGroups: ['Heading', 'People'],
  styleOverrides: ['--color-background', '--color-text', '--section-padding-y'],
  fields: [
    { name: 'eyebrow', label: 'Eyebrow', type: 'text', default: 'Our team', group: 'Heading' },
    {
      name: 'title',
      label: 'Title',
      type: 'text',
      default: 'The people who listen for a living',
      required: true,
      group: 'Heading',
    },
    {
      name: 'intro',
      label: 'Intro',
      type: 'textarea',
      default:
        'We are 28 people in 11 countries, and every one of us sits in on a customer interview each month.',
      group: 'Heading',
    },
    {
      name: 'people',
      label: 'People',
      type: 'list',
      group: 'People',
      minItems: 1,
      maxItems: 16,
      itemLabel: 'name',
      itemFields: [
        { name: 'photo', label: 'Photo', type: 'image', default: portrait('Portrait') },
        { name: 'name', label: 'Name', type: 'text', default: 'Name' },
        { name: 'role', label: 'Role', type: 'text', default: 'Role' },
      ],
      default: [
        person('Leila Haddad', 'Co-founder and CEO'),
        person('Mateo Ruiz', 'Co-founder and CTO'),
        person('Ingrid Solberg', 'Head of research'),
        person('Kwame Mensah', 'Head of engineering'),
        person('Yuki Tanaka', 'Senior product designer'),
        person('Daniel Novak', 'Customer success lead'),
        person('Aisha Bello', 'Machine learning engineer'),
        person('Ruth Callahan', 'People and operations'),
      ],
    },
  ],
};
