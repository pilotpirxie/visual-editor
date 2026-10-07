import type { ComponentDefinition } from '../../../types';

type PriceItem = { name: string; description: string; price: string; tag: string };

function item(name: string, description: string, price: string, tag = ''): PriceItem {
  return { name, description, price, tag };
}

export const definition: ComponentDefinition = {
  id: 'pricing-list',
  version: 1,
  name: 'Pricing, price list',
  category: 'pricing',
  description: 'Prices in named groups, like a menu or a list of service rates.',
  tags: ['pricing', 'price list', 'menu', 'rates', 'services', 'restaurant'],
  fieldGroups: ['Heading', 'Groups', 'Note'],
  styleOverrides: ['--color-background', '--color-text', '--section-padding-y'],
  fields: [
    {
      name: 'eyebrow',
      label: 'Eyebrow',
      type: 'text',
      default: 'Research services',
      group: 'Heading',
    },
    {
      name: 'title',
      label: 'Title',
      type: 'text',
      default: 'Hand off the parts of research you have no time for',
      required: true,
      group: 'Heading',
    },
    {
      name: 'intro',
      label: 'Intro',
      type: 'textarea',
      default:
        'Our researchers work inside your Fieldnote workspace, so every recording, tag and clip stays yours. Book one service or combine them into a full study.',
      group: 'Heading',
    },
    {
      name: 'groups',
      label: 'Groups',
      type: 'list',
      group: 'Groups',
      minItems: 1,
      maxItems: 8,
      itemLabel: 'name',
      itemFields: [
        { name: 'name', label: 'Group name', type: 'text', default: 'Group' },
        { name: 'note', label: 'Note', type: 'text', default: '' },
        {
          name: 'items',
          label: 'Items',
          type: 'list',
          minItems: 1,
          maxItems: 16,
          itemLabel: 'name',
          itemFields: [
            { name: 'name', label: 'Name', type: 'text', default: 'Item' },
            { name: 'description', label: 'Description', type: 'textarea', default: '' },
            { name: 'price', label: 'Price', type: 'text', default: '$0' },
            {
              name: 'tag',
              label: 'Tag',
              type: 'text',
              default: '',
            },
          ],
          default: [item('Item', '', '$0')],
        },
      ],
      default: [
        {
          name: 'Recruiting',
          note: 'Per participant',
          items: [
            item(
              'Customer list outreach',
              'We email your own customers, screen the replies and book calls straight into your calendar.',
              '$40',
            ),
            item(
              'Panel recruiting',
              'Business and consumer participants from our vetted panel in 14 countries.',
              '$90',
              'Popular',
            ),
            item(
              'Hard-to-reach roles',
              'Clinicians, finance leads, IT admins and other niche profiles, with a free replacement for no-shows.',
              '$180',
            ),
          ],
        },
        {
          name: 'Interviews',
          note: 'Per session',
          items: [
            item(
              'Moderated interview',
              'A senior researcher runs a 45-minute call from your discussion guide and tags it the same day.',
              '$350',
            ),
            item(
              'Usability session',
              'Task-based testing of your prototype or live product, with a clip of every stumble.',
              '$400',
            ),
            item(
              'Live interpreter',
              'An interpreter joins the call, for interviews in 12 languages.',
              '$120',
              'New',
            ),
          ],
        },
        {
          name: 'Synthesis',
          note: 'Per study of up to 12 interviews',
          items: [
            item(
              'Theme report',
              'Themes, supporting quotes and clips, written up as a report your stakeholders will actually read.',
              '$1,200',
              'Popular',
            ),
            item(
              'Highlight reel',
              'A three-minute video of the moments your team needs to see, cut from your recordings.',
              '$450',
            ),
            item(
              'Readout workshop',
              'A 90-minute session with your team to turn findings into decisions and owners.',
              '$600',
            ),
          ],
        },
        {
          name: 'Ongoing research',
          note: 'Per month',
          items: [
            item(
              'Continuous recruiting',
              'Five pre-screened participants every week, booked straight into your team’s calendars.',
              '$1,500',
              'New',
            ),
            item(
              'Research retainer',
              'Eight moderated interviews a month, tagged and summarized, with a monthly theme report.',
              '$4,800',
            ),
            item(
              'Office hours',
              'A weekly 60-minute call with a senior researcher to review your plans, guides and findings.',
              '$900',
            ),
          ],
        },
      ],
    },
    {
      name: 'footnote',
      label: 'Note below the list',
      type: 'textarea',
      default:
        'Prices in US dollars, excluding tax. Studies start within five business days of booking.',
      group: 'Note',
    },
  ],
};
