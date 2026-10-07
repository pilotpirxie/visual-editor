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
  id: 'features-tabs',
  version: 1,
  name: 'Features, tabs',
  category: 'features',
  description: 'A heading and tabs that each show a feature with text and a screenshot.',
  tags: ['features', 'tabs', 'tour', 'screenshots', 'product'],
  fieldGroups: ['Heading', 'Tabs'],
  styleOverrides: ['--color-background', '--color-text', '--section-padding-y'],
  behaviors: ['tabs'],
  fields: [
    { name: 'eyebrow', label: 'Eyebrow', type: 'text', default: 'How it works', group: 'Heading' },
    {
      name: 'title',
      label: 'Title',
      type: 'text',
      default: 'From raw recordings to decisions in one place',
      required: true,
      group: 'Heading',
    },
    {
      name: 'intro',
      label: 'Intro',
      type: 'textarea',
      default: 'Pick a step to see what Fieldnote does for your team at that point.',
      group: 'Heading',
    },
    {
      name: 'items',
      label: 'Tabs',
      type: 'list',
      group: 'Tabs',
      minItems: 2,
      maxItems: 6,
      itemLabel: 'label',
      itemFields: [
        { name: 'icon', label: 'Icon', type: 'icon', default: 'sparkles' },
        { name: 'label', label: 'Tab label', type: 'text', default: 'Tab', required: true },
        { name: 'title', label: 'Title', type: 'text', default: 'Feature title' },
        {
          name: 'text',
          label: 'Text',
          type: 'richtext',
          default: '<p>Describe what this step does for the reader.</p>',
        },
        { name: 'image', label: 'Image', type: 'image', default: screenshot('Product screenshot') },
      ],
      default: [
        {
          icon: 'mic',
          label: 'Record',
          title: 'Every call captured, with nobody taking notes',
          text: '<p>Fieldnote joins Zoom, Meet and Teams calls, or records in the room on your phone. Transcripts arrive minutes after you hang up, with speakers labelled.</p>',
          image: screenshot('A recorded interview with a live transcript beside the video'),
        },
        {
          icon: 'tag',
          label: 'Tag',
          title: 'Themes that build themselves while you read',
          text: '<p>Highlight a sentence and tag it, or accept the tags Fieldnote suggests. Every highlight lands on a shared board, grouped by theme across all your interviews.</p>',
          image: screenshot('A board of highlights grouped into themes with counts'),
        },
        {
          icon: 'share',
          label: 'Share',
          title: 'Clips your whole team will actually watch',
          text: '<p>Turn a theme into a two-minute reel of customers saying it in their own words. Send it to Slack or drop it into Jira next to the ticket it explains.</p>',
          image: screenshot('A highlight reel being shared to a Slack channel'),
        },
      ],
    },
  ],
};
