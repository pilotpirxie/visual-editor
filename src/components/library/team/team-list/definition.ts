import type { ComponentDefinition, ImageValue } from '../../../types';

type Person = { photo: ImageValue; name: string; role: string; bio: string };

function avatar(alt: string): ImageValue {
  return {
    source: 'placeholder',
    src: '',
    alt,
    decorative: false,
    width: 400,
    height: 400,
    placeholder: { ratio: '1:1', subject: 'person' },
  };
}

function person(name: string, role: string, bio: string): Person {
  return { photo: avatar(name), name, role, bio };
}

export const definition: ComponentDefinition = {
  id: 'team-list',
  version: 1,
  name: 'Team, list',
  category: 'team',
  description: 'A heading and compact rows with a small photo, name, role and one-line bio.',
  tags: ['team', 'people', 'advisors', 'investors', 'board', 'list', 'directory'],
  fieldGroups: ['Heading', 'People'],
  styleOverrides: ['--color-background', '--color-text', '--section-padding-y'],
  fields: [
    { name: 'eyebrow', label: 'Eyebrow', type: 'text', default: 'Advisors', group: 'Heading' },
    {
      name: 'title',
      label: 'Title',
      type: 'text',
      default: 'Backed by people who have run research at scale',
      required: true,
      group: 'Heading',
    },
    {
      name: 'intro',
      label: 'Intro',
      type: 'textarea',
      default:
        'Our advisors meet with the team every quarter and read every new interview guide we publish.',
      group: 'Heading',
    },
    {
      name: 'people',
      label: 'People',
      type: 'list',
      group: 'People',
      minItems: 1,
      maxItems: 24,
      itemLabel: 'name',
      itemFields: [
        { name: 'photo', label: 'Photo', type: 'image', default: avatar('Portrait') },
        { name: 'name', label: 'Name', type: 'text', default: 'Name' },
        { name: 'role', label: 'Role', type: 'text', default: 'Role' },
        {
          name: 'bio',
          label: 'Bio',
          type: 'textarea',
          maxLength: 160,
          default: 'One sentence about this person.',
        },
      ],
      default: [
        person(
          'Elena Petrova',
          'Advisor, research operations',
          'Grew the research team at a health insurer from two people to forty.',
        ),
        person(
          'Samuel Adeyemi',
          'Advisor, go-to-market',
          'Took two developer tools from their first customer to a public listing.',
        ),
        person(
          'Hiroshi Watanabe',
          'Advisor, speech recognition',
          'Spent a decade building speech models for languages most tools ignore.',
        ),
        person(
          'Clara Lindqvist',
          'Advisor, privacy and compliance',
          'Former data protection officer who keeps our consent flows short and clear.',
        ),
        person(
          'Omar Farouk',
          'Angel investor',
          'Founded and sold a survey platform used by 4,000 product teams.',
        ),
        person(
          'Beatriz Costa',
          'Advisor, design',
          'Ran design at a Lisbon banking app and still reviews our new screens.',
        ),
      ],
    },
  ],
};
