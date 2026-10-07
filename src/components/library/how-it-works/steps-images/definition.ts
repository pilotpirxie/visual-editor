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
  id: 'steps-images',
  version: 1,
  name: 'How it works, steps with images',
  category: 'how-it-works',
  description: 'A heading and three or four numbered steps, each with a screenshot.',
  tags: ['steps', 'process', 'how', 'numbers', 'screenshots', 'onboarding'],
  fieldGroups: ['Heading', 'Steps'],
  styleOverrides: ['--color-background', '--color-text', '--section-padding-y'],
  fields: [
    { name: 'eyebrow', label: 'Eyebrow', type: 'text', default: 'How it works', group: 'Heading' },
    {
      name: 'title',
      label: 'Title',
      type: 'text',
      default: 'From first call to shared insight in three steps',
      required: true,
      group: 'Heading',
    },
    {
      name: 'intro',
      label: 'Intro',
      type: 'textarea',
      default: 'Most teams run their first study in Fieldnote the same week they sign up.',
      group: 'Heading',
    },
    {
      name: 'steps',
      label: 'Steps',
      type: 'list',
      group: 'Steps',
      minItems: 2,
      maxItems: 4,
      itemLabel: 'title',
      itemFields: [
        { name: 'image', label: 'Image', type: 'image', default: screenshot('Product screenshot') },
        { name: 'title', label: 'Title', type: 'text', default: 'Step' },
        { name: 'text', label: 'Text', type: 'textarea', default: 'What happens in this step.' },
      ],
      default: [
        {
          image: screenshot(
            'Calendar settings with three customer interviews marked for recording',
          ),
          title: 'Invite Fieldnote to your calls',
          text: 'Connect Google or Outlook and pick the customer calls to record. Everyone is asked for consent first.',
        },
        {
          image: screenshot('A transcript with a highlighted quote and the tag menu open'),
          title: 'Highlight what matters',
          text: 'Select a sentence in the transcript and tag it, or accept the tags Fieldnote suggests.',
        },
        {
          image: screenshot('A theme board with a highlight reel ready to share'),
          title: 'Share the evidence',
          text: 'Group highlights into themes and send a reel of customer clips to Slack, Jira or Notion.',
        },
      ],
    },
  ],
};
