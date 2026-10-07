import type { ComponentDefinition } from '../../../types';

export const definition: ComponentDefinition = {
  id: 'features-checklist',
  version: 1,
  name: 'Features, checklist',
  category: 'features',
  description: 'A heading and button beside a list of benefits, each with a check mark.',
  tags: ['features', 'list', 'check', 'benefits', 'included'],
  fieldGroups: ['Heading', 'Button', 'Items'],
  styleOverrides: ['--color-background', '--color-text', '--section-padding-y'],
  fields: [
    {
      name: 'eyebrow',
      label: 'Eyebrow',
      type: 'text',
      default: 'Why teams switch',
      group: 'Heading',
    },
    {
      name: 'title',
      label: 'Title',
      type: 'text',
      default: 'Built for the way product teams actually do research',
      required: true,
      group: 'Heading',
    },
    {
      name: 'intro',
      label: 'Intro',
      type: 'textarea',
      default: 'No research ops team needed. Fieldnote works with the tools you already use.',
      group: 'Heading',
    },
    { name: 'showButton', label: 'Show button', type: 'boolean', default: true, group: 'Button' },
    {
      name: 'button',
      label: 'Button',
      type: 'button',
      default: {
        label: 'Compare plans',
        link: { type: 'section', anchor: 'pricing', newTab: false },
        variant: 'secondary',
      },
      visibleWhen: { field: 'showButton', equals: true },
      group: 'Button',
    },
    {
      name: 'checkIcon',
      label: 'Check icon',
      type: 'icon',
      default: 'check-circle',
      group: 'Items',
    },
    {
      name: 'items',
      label: 'Items',
      type: 'list',
      group: 'Items',
      minItems: 1,
      maxItems: 10,
      itemLabel: 'title',
      itemFields: [
        { name: 'title', label: 'Title', type: 'text', default: 'Benefit' },
        { name: 'text', label: 'Text', type: 'textarea', default: 'One sentence about it.' },
      ],
      default: [
        {
          title: 'Works with Zoom, Meet and Teams',
          text: 'Calls are recorded and imported for you.',
        },
        { title: 'Transcripts in 30 languages', text: 'With speaker labels and timestamps.' },
        { title: 'Shared tags across projects', text: 'One vocabulary for the whole company.' },
        {
          title: 'Single sign-on and audit logs',
          text: 'Ready for security reviews from day one.',
        },
        { title: 'Exports to Notion, Jira and Slack', text: 'Insights go where work happens.' },
      ],
    },
  ],
};
