import type { ComponentDefinition } from '../../../types';

export const definition: ComponentDefinition = {
  id: 'features-grid-3',
  version: 1,
  name: 'Features grid, 3 columns',
  category: 'features',
  description: 'Heading, intro and a grid of feature cards with icons.',
  tags: ['grid', 'cards', 'icons', 'benefits'],
  fieldGroups: ['Heading', 'Items', 'Layout'],
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
      default: 'Everything between the call and the roadmap',
      required: true,
      group: 'Heading',
    },
    {
      name: 'intro',
      label: 'Intro',
      type: 'richtext',
      default:
        '<p>Fieldnote takes care of the busywork of research, so your team spends its time on what customers actually said.</p>',
      group: 'Heading',
    },
    {
      name: 'items',
      label: 'Features',
      type: 'list',
      group: 'Items',
      minItems: 1,
      maxItems: 12,
      itemLabel: 'title',
      itemFields: [
        { name: 'icon', label: 'Icon', type: 'icon', default: 'zap' },
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
          icon: 'zap',
          title: 'Transcripts in minutes',
          text: 'Upload a recording or connect your calendar, and get a searchable transcript before your next meeting starts.',
        },
        {
          icon: 'shield',
          title: 'Private by default',
          text: 'Recordings stay in your workspace, with access per project and automatic redaction of personal details.',
        },
        {
          icon: 'smile',
          title: 'Built for the whole team',
          text: 'Designers, product managers and engineers quote the same source, so nobody argues from memory.',
        },
      ],
    },
    {
      name: 'align',
      label: 'Heading alignment',
      type: 'segmented',
      default: 'center',
      group: 'Layout',
      options: [
        { value: 'left', label: 'Left', icon: 'align-left' },
        { value: 'center', label: 'Center', icon: 'align-center' },
      ],
    },
    {
      name: 'columns',
      label: 'Columns on desktop',
      type: 'select',
      default: '3',
      group: 'Layout',
      options: [
        { value: '2', label: '2' },
        { value: '3', label: '3' },
        { value: '4', label: '4' },
      ],
    },
  ],
};
