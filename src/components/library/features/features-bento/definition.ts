import type { ComponentDefinition, ImageValue } from '../../../types';

function screenshot(alt: string): ImageValue {
  return {
    source: 'placeholder',
    src: '',
    alt,
    decorative: false,
    width: 1200,
    height: 900,
    placeholder: { ratio: '4:3', subject: 'screenshot' },
  };
}

export const definition: ComponentDefinition = {
  id: 'features-bento',
  version: 1,
  name: 'Features, bento grid',
  category: 'features',
  description: 'A heading and feature tiles of mixed sizes, each with an icon or an image.',
  tags: ['features', 'bento', 'grid', 'tiles', 'cards', 'screenshots', 'icons'],
  fieldGroups: ['Heading', 'Tiles'],
  styleOverrides: ['--color-background', '--color-text', '--section-padding-y'],
  fields: [
    { name: 'eyebrow', label: 'Eyebrow', type: 'text', default: 'Features', group: 'Heading' },
    {
      name: 'title',
      label: 'Title',
      type: 'text',
      default: 'One workspace for everything customers tell you',
      required: true,
      group: 'Heading',
    },
    {
      name: 'intro',
      label: 'Intro',
      type: 'textarea',
      default: 'From the first recording to the roadmap review, every quote stays one search away.',
      group: 'Heading',
    },
    {
      name: 'items',
      label: 'Tiles',
      type: 'list',
      group: 'Tiles',
      minItems: 1,
      maxItems: 8,
      itemLabel: 'title',
      itemFields: [
        {
          name: 'size',
          label: 'Tile size',
          type: 'select',
          default: 'small',
          options: [
            { value: 'small', label: 'Small' },
            { value: 'wide', label: 'Wide' },
            { value: 'large', label: 'Large' },
          ],
        },
        {
          name: 'visual',
          label: 'Show',
          type: 'select',
          default: 'icon',
          options: [
            { value: 'icon', label: 'Icon' },
            { value: 'image', label: 'Image' },
          ],
        },
        {
          name: 'icon',
          label: 'Icon',
          type: 'icon',
          default: 'sparkles',
          visibleWhen: { field: 'visual', equals: 'icon' },
        },
        {
          name: 'image',
          label: 'Image',
          type: 'image',
          default: screenshot('Product screenshot'),
          visibleWhen: { field: 'visual', equals: 'image' },
        },
        { name: 'title', label: 'Title', type: 'text', default: 'Feature title' },
        {
          name: 'text',
          label: 'Text',
          type: 'textarea',
          default: 'Describe the benefit in one or two sentences.',
        },
      ],
      default: [
        {
          size: 'large',
          visual: 'image',
          icon: 'search',
          image: screenshot('Search results with quotes about onboarding from twelve interviews'),
          title: 'Search every interview at once',
          text: 'Type a feature, a competitor or a complaint and jump to the exact moment a customer said it, across years of calls.',
        },
        {
          size: 'small',
          visual: 'icon',
          icon: 'transcript',
          image: screenshot('Product screenshot'),
          title: 'Transcripts in 30 languages',
          text: 'Speaker labels and timestamps, ready minutes after the call ends.',
        },
        {
          size: 'small',
          visual: 'icon',
          icon: 'sparkles',
          image: screenshot('Product screenshot'),
          title: 'Suggested tags',
          text: 'Fieldnote proposes tags as you read, from the themes your team already tracks.',
        },
        {
          size: 'small',
          visual: 'icon',
          icon: 'lock',
          image: screenshot('Product screenshot'),
          title: 'Automatic redaction',
          text: 'Names, emails and card numbers are masked before a clip leaves the project.',
        },
        {
          size: 'wide',
          visual: 'image',
          icon: 'share',
          image: screenshot('A highlight reel of six customer clips, ready to post in Slack'),
          title: 'Highlight reels for Slack and Jira',
          text: 'Turn a theme into a two-minute reel of customers in their own words, and post it where decisions get made.',
        },
      ],
    },
  ],
};
