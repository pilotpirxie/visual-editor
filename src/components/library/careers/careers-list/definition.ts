import type { ComponentDefinition, LinkValue } from '../../../types';

const ROLE_LINK: LinkValue = { type: 'url', url: '#', newTab: false };

type Position = { title: string; team: string; location: string; type: string; link: LinkValue };

function position(title: string, team: string, location: string, type: string): Position {
  return { title, team, location, type, link: ROLE_LINK };
}

export const definition: ComponentDefinition = {
  id: 'careers-list',
  version: 1,
  name: 'Careers, open positions',
  category: 'careers',
  description: 'A heading and a list of open roles with team, location and type.',
  tags: ['careers', 'jobs', 'hiring', 'positions', 'roles', 'work with us'],
  fieldGroups: ['Heading', 'Positions'],
  styleOverrides: ['--color-background', '--color-text', '--section-padding-y'],
  fields: [
    { name: 'eyebrow', label: 'Eyebrow', type: 'text', default: 'Careers', group: 'Heading' },
    {
      name: 'title',
      label: 'Title',
      type: 'text',
      default: 'Help product teams hear their customers',
      required: true,
      group: 'Heading',
    },
    {
      name: 'intro',
      label: 'Intro',
      type: 'textarea',
      default:
        'We are a remote team of 28 across 11 countries. Every role comes with a home office budget and four weeks of focus time a year.',
      group: 'Heading',
    },
    {
      name: 'positions',
      label: 'Positions',
      type: 'list',
      group: 'Positions',
      minItems: 0,
      maxItems: 30,
      itemLabel: 'title',
      itemFields: [
        { name: 'title', label: 'Job title', type: 'text', default: 'Job title' },
        { name: 'team', label: 'Team', type: 'text', default: 'Team' },
        { name: 'location', label: 'Location', type: 'text', default: 'Remote' },
        { name: 'type', label: 'Type', type: 'text', default: 'Full-time' },
        { name: 'link', label: 'Link', type: 'link', default: ROLE_LINK },
      ],
      default: [
        position(
          'Senior backend engineer, transcription',
          'Engineering',
          'Remote, Europe',
          'Full-time',
        ),
        position('Product designer, research workflows', 'Design', 'Remote, Americas', 'Full-time'),
        position(
          'Customer success manager',
          'Customer success',
          'Remote, US or Canada',
          'Full-time',
        ),
        position('Content writer, research guides', 'Marketing', 'Remote, anywhere', 'Part-time'),
      ],
    },
    {
      name: 'emptyText',
      label: 'Text when there are no open roles',
      type: 'text',
      default: 'No open roles right now. Send us a note at jobs@fieldnote.example.',
      group: 'Positions',
    },
  ],
};
