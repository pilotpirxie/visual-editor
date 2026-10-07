import type { ComponentDefinition, Field } from '../../../types';

const PLAN_LINK = { type: 'url', url: '#', newTab: false };

type ComparisonRow = {
  group: string;
  feature: string;
  plan1: string;
  plan2: string;
  plan3: string;
  plan4: string;
};

function row(
  feature: string,
  starter: string,
  team: string,
  business: string,
  group = '',
): ComparisonRow {
  return { group, feature, plan1: starter, plan2: team, plan3: business, plan4: '' };
}

function cellField(name: string, label: string): Field {
  return { name, label: `${label}: yes, no or short text`, type: 'text', default: '' };
}

export const definition: ComponentDefinition = {
  id: 'pricing-comparison',
  version: 1,
  name: 'Pricing, comparison table',
  category: 'pricing',
  description: 'A table that compares up to four plans feature by feature, in labelled groups.',
  tags: ['pricing', 'plans', 'compare', 'comparison', 'table', 'features'],
  fieldGroups: ['Heading', 'Plans', 'Rows'],
  styleOverrides: ['--color-background', '--color-text', '--section-padding-y'],
  fields: [
    { name: 'eyebrow', label: 'Eyebrow', type: 'text', default: 'Compare plans', group: 'Heading' },
    {
      name: 'title',
      label: 'Title',
      type: 'text',
      default: 'Every feature, side by side',
      required: true,
      group: 'Heading',
    },
    {
      name: 'intro',
      label: 'Intro',
      type: 'textarea',
      default: 'All plans include unlimited viewers and a 14-day free trial of Team.',
      group: 'Heading',
    },
    {
      name: 'featureLabel',
      label: 'First column heading',
      type: 'text',
      default: 'Features',
      required: true,
      group: 'Plans',
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
      minItems: 2,
      maxItems: 4,
      itemLabel: 'name',
      itemFields: [
        { name: 'name', label: 'Plan name', type: 'text', default: 'Plan' },
        { name: 'price', label: 'Price', type: 'text', default: '$0' },
        { name: 'period', label: 'Period', type: 'text', default: 'per month' },
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
          featured: false,
          button: { label: 'Start for free', link: PLAN_LINK, variant: 'secondary' },
        },
        {
          name: 'Team',
          price: '$29',
          period: 'per editor, per month',
          featured: true,
          button: { label: 'Start free trial', link: PLAN_LINK, variant: 'primary' },
        },
        {
          name: 'Business',
          price: '$79',
          period: 'per editor, per month',
          featured: false,
          button: { label: 'Talk to sales', link: PLAN_LINK, variant: 'secondary' },
        },
      ],
    },
    {
      name: 'rows',
      label: 'Rows',
      type: 'list',
      group: 'Rows',
      minItems: 1,
      maxItems: 40,
      itemLabel: 'feature',
      itemFields: [
        {
          name: 'group',
          label: 'Start a group',
          type: 'text',
          default: '',
        },
        { name: 'feature', label: 'Feature', type: 'text', default: 'Feature' },
        cellField('plan1', 'First plan'),
        cellField('plan2', 'Second plan'),
        cellField('plan3', 'Third plan'),
        cellField('plan4', 'Fourth plan'),
      ],
      default: [
        row('Interview recording and upload', 'yes', 'yes', 'yes', 'Research'),
        row('Transcription', '10 hours a month', 'Unlimited', 'Unlimited'),
        row('Transcript languages', '12', '30', '30'),
        row('Highlights and tags', 'yes', 'yes', 'yes'),
        row('Automatic theme tagging', 'no', 'yes', 'yes'),
        row('Editors', '1', 'Up to 50', 'Unlimited', 'Collaboration'),
        row('Viewers', '3', 'Unlimited', 'Unlimited'),
        row('Shared tag library', 'no', 'yes', 'yes'),
        row('Slack, Jira and Notion exports', 'no', 'yes', 'yes'),
        row('Single sign-on', 'no', 'no', 'yes', 'Security and support'),
        row('Audit logs', 'no', 'no', 'yes'),
        row('Data residency in the EU, US or Canada', 'no', 'no', 'yes'),
        row('Support', 'Help center', 'Priority email', 'Named manager'),
      ],
    },
  ],
};
