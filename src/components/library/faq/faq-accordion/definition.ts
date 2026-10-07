import type { ComponentDefinition } from '../../../types';

export const definition: ComponentDefinition = {
  id: 'faq-accordion',
  version: 1,
  name: 'FAQ, accordion',
  category: 'faq',
  description: 'A heading and questions that open one at a time. Works without JavaScript.',
  tags: ['faq', 'questions', 'accordion', 'help', 'answers'],
  fieldGroups: ['Heading', 'Questions'],
  styleOverrides: ['--color-background', '--color-text', '--section-padding-y'],
  fields: [
    { name: 'eyebrow', label: 'Eyebrow', type: 'text', default: 'FAQ', group: 'Heading' },
    {
      name: 'title',
      label: 'Title',
      type: 'text',
      default: 'Questions teams ask before they start',
      required: true,
      group: 'Heading',
    },
    {
      name: 'expandIcon',
      label: 'Open and close icon',
      type: 'icon',
      default: 'chevron-down',
      group: 'Questions',
    },
    {
      name: 'items',
      label: 'Questions',
      type: 'list',
      group: 'Questions',
      minItems: 1,
      maxItems: 20,
      itemLabel: 'question',
      itemFields: [
        { name: 'question', label: 'Question', type: 'text', default: 'A question?' },
        { name: 'answer', label: 'Answer', type: 'richtext', default: '<p>The answer.</p>' },
      ],
      default: [
        {
          question: 'Do customers know they are being recorded?',
          answer:
            '<p>Yes. Fieldnote announces itself when it joins a call, and you can send a consent note with every invite.</p>',
        },
        {
          question: 'Where is our data stored?',
          answer:
            '<p>In the region you choose: the EU, the US or Canada. Recordings are encrypted at rest and in transit.</p>',
        },
        {
          question: 'Can we import interviews we already recorded?',
          answer:
            '<p>Drop in audio or video files, or connect your cloud drive. Past interviews are transcribed and tagged like new ones.</p>',
        },
        {
          question: 'What happens when the trial ends?',
          answer:
            '<p>Nothing is deleted. Pick a plan to keep editing, or stay on Starter to keep reading what you have.</p>',
        },
      ],
    },
  ],
};
