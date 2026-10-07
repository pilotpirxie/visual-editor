import type { ComponentDefinition } from '../../../types';

export const definition: ComponentDefinition = {
  id: 'steps-row',
  version: 1,
  name: 'How it works, numbered steps',
  category: 'how-it-works',
  description: 'A heading and three or four numbered steps side by side.',
  tags: ['steps', 'process', 'how', 'numbers', 'onboarding'],
  fieldGroups: ['Heading', 'Steps'],
  styleOverrides: ['--color-background', '--color-text', '--section-padding-y'],
  fields: [
    { name: 'eyebrow', label: 'Eyebrow', type: 'text', default: 'How it works', group: 'Heading' },
    {
      name: 'title',
      label: 'Title',
      type: 'text',
      default: 'Set up in an afternoon, useful from the first call',
      required: true,
      group: 'Heading',
    },
    {
      name: 'steps',
      label: 'Steps',
      type: 'list',
      group: 'Steps',
      minItems: 2,
      maxItems: 6,
      itemLabel: 'title',
      itemFields: [
        { name: 'title', label: 'Title', type: 'text', default: 'Step' },
        { name: 'text', label: 'Text', type: 'textarea', default: 'What happens in this step.' },
      ],
      default: [
        {
          title: 'Connect your calendar',
          text: 'Fieldnote joins the customer calls you choose and records them with consent.',
        },
        {
          title: 'Review the highlights',
          text: 'Skim the moments Fieldnote flagged and add your own tags in a few clicks.',
        },
        {
          title: 'Share what you learned',
          text: 'Send a summary with quotes and clips to the people who make the calls.',
        },
      ],
    },
  ],
};
