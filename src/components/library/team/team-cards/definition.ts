import type { ComponentDefinition, ImageValue, LinkValue } from '../../../types';

type SocialLink = { label: string; icon: string; link: LinkValue };

function portrait(alt: string): ImageValue {
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

function social(label: string, icon: string, url: string): SocialLink {
  return { label, icon, link: { type: 'url', url, newTab: true } };
}

export const definition: ComponentDefinition = {
  id: 'team-cards',
  version: 1,
  name: 'Team, cards with social links',
  category: 'team',
  description: 'A heading and cards with a photo, name, role, short bio and social links.',
  tags: ['team', 'people', 'about', 'leadership', 'bio', 'social'],
  fieldGroups: ['Heading', 'People'],
  styleOverrides: ['--color-background', '--color-text', '--section-padding-y'],
  fields: [
    { name: 'eyebrow', label: 'Eyebrow', type: 'text', default: 'Leadership', group: 'Heading' },
    {
      name: 'title',
      label: 'Title',
      type: 'text',
      default: 'Meet the people building Fieldnote',
      required: true,
      group: 'Heading',
    },
    {
      name: 'intro',
      label: 'Intro',
      type: 'textarea',
      default:
        'Fieldnote started in 2022 as a side project to search three years of interview recordings. It is now a team of 28.',
      group: 'Heading',
    },
    {
      name: 'people',
      label: 'People',
      type: 'list',
      group: 'People',
      minItems: 1,
      maxItems: 12,
      itemLabel: 'name',
      itemFields: [
        { name: 'photo', label: 'Photo', type: 'image', default: portrait('Portrait') },
        { name: 'name', label: 'Name', type: 'text', default: 'Name' },
        { name: 'role', label: 'Role', type: 'text', default: 'Role' },
        {
          name: 'bio',
          label: 'Bio',
          type: 'textarea',
          maxLength: 200,
          default: 'One or two sentences about what this person does.',
        },
        {
          name: 'socials',
          label: 'Social links',
          type: 'list',
          minItems: 0,
          maxItems: 4,
          itemLabel: 'label',
          itemFields: [
            { name: 'label', label: 'Name', type: 'text', default: 'LinkedIn' },
            {
              name: 'icon',
              label: 'Icon',
              type: 'icon',
              default: 'simple-icons:linkedin',
              iconPurpose: 'brand',
            },
            {
              name: 'link',
              label: 'Link',
              type: 'link',
              default: { type: 'url', url: 'https://www.linkedin.com', newTab: true },
            },
          ],
          default: [],
        },
      ],
      default: [
        {
          photo: portrait('Leila Haddad'),
          name: 'Leila Haddad',
          role: 'Co-founder and CEO',
          bio: 'Led research teams for eight years and re-watched too many calls to find one quote. Started Fieldnote to fix that.',
          socials: [
            social('LinkedIn', 'simple-icons:linkedin', 'https://www.linkedin.com'),
            social('X', 'simple-icons:x', 'https://x.com'),
          ],
        },
        {
          photo: portrait('Mateo Ruiz'),
          name: 'Mateo Ruiz',
          role: 'Co-founder and CTO',
          bio: 'Built speech recognition for call centers before Fieldnote. Makes sure transcripts arrive before the call notes do.',
          socials: [
            social('LinkedIn', 'simple-icons:linkedin', 'https://www.linkedin.com'),
            social('GitHub', 'simple-icons:github', 'https://github.com'),
          ],
        },
        {
          photo: portrait('Ingrid Solberg'),
          name: 'Ingrid Solberg',
          role: 'Head of research',
          bio: 'Has run more than 900 customer interviews and writes the guides our customers use to run theirs.',
          socials: [
            social('LinkedIn', 'simple-icons:linkedin', 'https://www.linkedin.com'),
            social('Bluesky', 'simple-icons:bluesky', 'https://bsky.app'),
          ],
        },
      ],
    },
  ],
};
