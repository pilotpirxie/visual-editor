import type { ComponentDefinition } from '../../../types';

export const definition: ComponentDefinition = {
  id: 'content-text-image',
  version: 1,
  name: 'Content, text and image',
  category: 'content',
  description: 'A heading and formatted text next to an image, on either side.',
  tags: ['about', 'story', 'image', 'text', 'split'],
  fieldGroups: ['Content', 'Image', 'Layout'],
  styleOverrides: ['--color-background', '--color-text', '--section-padding-y'],
  fields: [
    {
      name: 'eyebrow',
      label: 'Eyebrow',
      type: 'text',
      default: 'Built with research teams',
      group: 'Content',
    },
    {
      name: 'title',
      label: 'Title',
      type: 'text',
      default: 'Every interview tagged, quoted and ready to share',
      required: true,
      group: 'Content',
    },
    {
      name: 'body',
      label: 'Text',
      type: 'richtext',
      default:
        '<p>Fieldnote listens for the moments that matter, so you can stop rewinding recordings and start writing the brief.</p><ul><li>Highlights grouped by theme across every call</li><li>Quotes linked to the exact second they were said</li><li>Summaries your stakeholders actually read</li></ul>',
      group: 'Content',
    },
    {
      name: 'image',
      label: 'Image',
      type: 'image',
      default: {
        source: 'placeholder',
        src: '',
        alt: 'A product manager reviewing tagged interview highlights on a laptop',
        decorative: false,
        width: 1200,
        height: 900,
        placeholder: { ratio: '4:3', subject: 'screenshot' },
      },
      group: 'Image',
    },
    {
      name: 'imageSide',
      label: 'Image side',
      type: 'segmented',
      default: 'right',
      group: 'Layout',
      options: [
        { value: 'left', label: 'Left', icon: 'panel-left' },
        { value: 'right', label: 'Right', icon: 'panel-right' },
      ],
    },
  ],
};
