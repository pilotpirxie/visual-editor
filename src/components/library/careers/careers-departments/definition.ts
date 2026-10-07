import type { ComponentDefinition, LinkValue } from '../../../types';

const ROLE_LINK: LinkValue = { type: 'url', url: '#', newTab: false };

type Position = { title: string; location: string; type: string; link: LinkValue };

function position(title: string, location: string, type: string): Position {
  return { title, location, type, link: ROLE_LINK };
}

export const definition: ComponentDefinition = {
  id: 'careers-departments',
  version: 1,
  name: 'Careers, positions by department',
  category: 'careers',
  description: 'Open roles grouped by department, each with a short description and a role count.',
  tags: ['careers', 'jobs', 'hiring', 'positions', 'departments', 'teams'],
  fieldGroups: ['Heading', 'Departments'],
  styleOverrides: ['--color-background', '--color-text', '--section-padding-y'],
  fields: [
    { name: 'eyebrow', label: 'Eyebrow', type: 'text', default: 'Open roles', group: 'Heading' },
    {
      name: 'title',
      label: 'Title',
      type: 'text',
      default: 'Find your team at Fieldnote',
      required: true,
      group: 'Heading',
    },
    {
      name: 'intro',
      label: 'Intro',
      type: 'textarea',
      default:
        'Every role is fully remote, with team weeks in Lisbon twice a year. We reply to every application within ten days.',
      group: 'Heading',
    },
    {
      name: 'roleLabel',
      label: 'Count label for one role',
      type: 'text',
      default: 'open role',
      group: 'Departments',
    },
    {
      name: 'rolesLabel',
      label: 'Count label for several roles',
      type: 'text',
      default: 'open roles',
      group: 'Departments',
    },
    {
      name: 'departments',
      label: 'Departments',
      type: 'list',
      group: 'Departments',
      minItems: 1,
      maxItems: 8,
      itemLabel: 'name',
      itemFields: [
        { name: 'name', label: 'Department', type: 'text', default: 'Department' },
        { name: 'description', label: 'Description', type: 'textarea', default: '' },
        {
          name: 'positions',
          label: 'Positions',
          type: 'list',
          minItems: 0,
          maxItems: 12,
          itemLabel: 'title',
          itemFields: [
            { name: 'title', label: 'Job title', type: 'text', default: 'Job title' },
            { name: 'location', label: 'Location', type: 'text', default: 'Remote' },
            { name: 'type', label: 'Type', type: 'text', default: 'Full-time' },
            { name: 'link', label: 'Link', type: 'link', default: ROLE_LINK },
          ],
          default: [],
        },
      ],
      default: [
        {
          name: 'Engineering',
          description:
            'Nine engineers in six countries who build the recorder, the transcription pipeline and the web app.',
          positions: [
            position('Senior backend engineer, transcription', 'Remote, Europe', 'Full-time'),
            position('Machine learning engineer, speech', 'Remote, UTC−3 to UTC+3', 'Full-time'),
            position('Senior frontend engineer', 'Remote, Americas or Europe', 'Full-time'),
          ],
        },
        {
          name: 'Design and research',
          description:
            'A small team that interviews our own customers every week, using Fieldnote.',
          positions: [
            position('Product designer, research workflows', 'Remote, Americas', 'Full-time'),
          ],
        },
        {
          name: 'Customer success',
          description: 'We help research teams run their first study in their first week.',
          positions: [
            position('Customer success manager', 'Remote, US or Canada', 'Full-time'),
            position('Support specialist', 'Remote, Europe', 'Full-time'),
          ],
        },
      ],
    },
  ],
};
