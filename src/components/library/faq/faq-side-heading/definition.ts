import type { ComponentDefinition } from '../../../types';

export const definition: ComponentDefinition = {
  id: 'faq-side-heading',
  version: 1,
  name: 'FAQ, heading on the side',
  category: 'faq',
  description: 'A heading and contact link on the left, questions on the right.',
  tags: ['faq', 'questions', 'help', 'support', 'contact'],
  fieldGroups: ['Heading', 'Questions'],
  styleOverrides: ['--color-background', '--color-text', '--section-padding-y'],
  fields: [
    {
      name: 'title',
      label: 'Title',
      type: 'text',
      default: 'Frequently asked questions',
      required: true,
      group: 'Heading',
    },
    {
      name: 'text',
      label: 'Text',
      type: 'textarea',
      default: 'Cannot find the answer you need? Our support team replies within one business day.',
      group: 'Heading',
    },
    { name: 'showButton', label: 'Show button', type: 'boolean', default: true, group: 'Heading' },
    {
      name: 'button',
      label: 'Button',
      type: 'button',
      default: {
        label: 'Contact support',
        link: { type: 'email', url: 'support@fieldnote.example', newTab: false },
        variant: 'secondary',
      },
      visibleWhen: { field: 'showButton', equals: true },
      group: 'Heading',
    },
    {
      name: 'expandIcon',
      label: 'Open and close icon',
      type: 'icon',
      default: 'plus',
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
          question: 'How is pricing counted?',
          answer:
            '<p>You pay for editors, the people who tag and write. Viewers who read reports and watch clips are free.</p>',
        },
        {
          question: 'Do you offer discounts for nonprofits?',
          answer:
            '<p>Yes, nonprofits and schools get 50% off any paid plan. Write to us with a link to your organization.</p>',
        },
        {
          question: 'Can I cancel at any time?',
          answer: '<p>Yes. Plans are monthly, and you can export everything before you leave.</p>',
        },
      ],
    },
  ],
};
