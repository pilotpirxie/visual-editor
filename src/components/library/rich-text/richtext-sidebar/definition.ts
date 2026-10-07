import type { ComponentDefinition, LinkValue } from '../../../types';

type SidebarLink = { label: string; link: LinkValue };

const HASH: LinkValue = { type: 'url', url: '#', newTab: false };

const GUIDE_BODY = [
  '<p>Good research starts with the right people. Five well-chosen participants will teach you more than twenty who happened to be free on Tuesday. This guide covers how the Fieldnote research team finds, screens and schedules customers for interviews, so you can do the same.</p>',
  '<h2>Decide who you need to hear from</h2>',
  '<p>Write down the decision your research should inform, then list the people whose behavior shapes it. If you are reworking onboarding, talk to customers who joined in the last two months, including some who never came back.</p>',
  '<ul><li>Recent sign-ups who finished setup</li><li>Recent sign-ups who stalled after the first week</li><li>Admins who invited their team, and the people they invited</li></ul>',
  '<h2>Write a short screener</h2>',
  '<p>Three to five questions are enough. Ask about what people did recently, not what they would do, and avoid questions that hint at the answer you hope for. End with one open question: the way people answer it is the best sign of who will speak openly.</p>',
  '<h3>Offer a fair thank-you</h3>',
  '<p>For 30 minutes of someone’s time, a gift card worth $50 to $100 is typical. For specialists such as finance leads or clinicians, budget more and expect slower replies.</p>',
  '<p>Once people accept, send a calendar invite with the consent form attached, and connect your calendar to Fieldnote so every call is recorded and transcribed automatically.</p>',
].join('');

function sidebarLink(label: string): SidebarLink {
  return { label, link: HASH };
}

export const definition: ComponentDefinition = {
  id: 'richtext-sidebar',
  version: 1,
  name: 'Rich text, with sidebar',
  category: 'rich-text',
  description: 'A narrow column of long-form text with a sidebar of related links on desktop.',
  tags: ['article', 'guide', 'docs', 'text', 'sidebar', 'long-form', 'prose', 'links'],
  fieldGroups: ['Heading', 'Article', 'Sidebar'],
  styleOverrides: ['--color-background', '--color-text', '--section-padding-y'],
  fields: [
    { name: 'eyebrow', label: 'Eyebrow', type: 'text', default: 'Guide', group: 'Heading' },
    {
      name: 'title',
      label: 'Title',
      type: 'text',
      default: 'How to recruit participants for interviews',
      required: true,
      maxLength: 140,
      group: 'Heading',
    },
    {
      name: 'lead',
      label: 'Lead paragraph',
      type: 'textarea',
      default:
        'A practical guide to finding, screening and scheduling the right customers, from the Fieldnote research team.',
      group: 'Heading',
    },
    {
      name: 'body',
      label: 'Article',
      type: 'richtext',
      allowHeadings: true,
      default: GUIDE_BODY,
      group: 'Article',
    },
    {
      name: 'sidebarTitle',
      label: 'Sidebar title',
      type: 'text',
      default: 'Related guides',
      required: true,
      group: 'Sidebar',
    },
    {
      name: 'sidebarText',
      label: 'Sidebar text',
      type: 'textarea',
      default: 'Short, practical guides for every step of a research project.',
      group: 'Sidebar',
    },
    {
      name: 'links',
      label: 'Sidebar links',
      type: 'list',
      group: 'Sidebar',
      minItems: 1,
      maxItems: 8,
      itemLabel: 'label',
      itemFields: [
        { name: 'label', label: 'Label', type: 'text', default: 'Link' },
        { name: 'link', label: 'Link', type: 'link', default: HASH },
      ],
      default: [
        sidebarLink('Writing a discussion guide'),
        sidebarLink('Running your first interview'),
        sidebarLink('Tagging highlights as a team'),
        sidebarLink('Sharing findings with engineers'),
      ],
    },
  ],
};
