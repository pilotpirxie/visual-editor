import type { ComponentDefinition } from '../../../types';

const PLAN_LINK = { type: 'url', url: '#', newTab: false };

export const definition: ComponentDefinition = {
  id: 'pricing-3-plans',
  version: 1,
  name: 'Pricing, three plans',
  category: 'pricing',
  description: 'A heading and up to four plan cards; one can be marked as the most popular.',
  tags: ['pricing', 'plans', 'tiers', 'cards', 'compare'],
  fieldGroups: ['Heading', 'Plans'],
  styleOverrides: ['--color-background', '--color-text', '--section-padding-y'],
  fields: [
    { name: 'eyebrow', label: 'Eyebrow', type: 'text', default: 'Pricing', group: 'Heading' },
    {
      name: 'title',
      label: 'Title',
      type: 'text',
      default: 'Simple plans that grow with your research',
      required: true,
      group: 'Heading',
    },
    {
      name: 'intro',
      label: 'Intro',
      type: 'textarea',
      default: 'Every plan starts with a 14-day free trial. Change or cancel at any time.',
      group: 'Heading',
    },
    {
      name: 'featuredLabel',
      label: 'Label on the featured plan',
      type: 'text',
      default: 'Most popular',
      group: 'Plans',
    },
    {
      name: 'plans',
      label: 'Plans',
      type: 'list',
      group: 'Plans',
      minItems: 1,
      maxItems: 4,
      itemLabel: 'name',
      itemFields: [
        { name: 'name', label: 'Plan name', type: 'text', default: 'Plan' },
        { name: 'price', label: 'Price', type: 'text', default: '$0' },
        { name: 'period', label: 'Period', type: 'text', default: 'per month' },
        {
          name: 'description',
          label: 'Description',
          type: 'textarea',
          default: 'Who this plan is for.',
        },
        {
          name: 'features',
          label: 'Included',
          type: 'richtext',
          default: '<ul><li>First feature</li><li>Second feature</li></ul>',
        },
        { name: 'featured', label: 'Featured', type: 'boolean', default: false },
        {
          name: 'button',
          label: 'Button',
          type: 'button',
          default: { label: 'Choose plan', link: PLAN_LINK, variant: 'secondary' },
        },
      ],
      default: [
        {
          name: 'Starter',
          price: '$0',
          period: 'for one researcher',
          description: 'For trying Fieldnote on your next round of interviews.',
          features:
            '<ul><li>10 hours of transcripts a month</li><li>Highlights and tags</li><li>Share read-only links</li></ul>',
          featured: false,
          button: { label: 'Start for free', link: PLAN_LINK, variant: 'secondary' },
        },
        {
          name: 'Team',
          price: '$29',
          period: 'per editor, per month',
          description: 'For product teams who talk to customers every week.',
          features:
            '<ul><li>Unlimited transcripts</li><li>Shared themes across projects</li><li>Slack and Jira exports</li><li>Priority support</li></ul>',
          featured: true,
          button: { label: 'Start free trial', link: PLAN_LINK, variant: 'primary' },
        },
        {
          name: 'Business',
          price: '$79',
          period: 'per editor, per month',
          description: 'For research programs across several teams.',
          features:
            '<ul><li>Everything in Team</li><li>Single sign-on</li><li>Audit logs and data residency</li></ul>',
          featured: false,
          button: { label: 'Talk to sales', link: PLAN_LINK, variant: 'secondary' },
        },
      ],
    },
  ],
};
