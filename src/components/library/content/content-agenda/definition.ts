import type { ComponentDefinition } from '../../../types';

type Session = {
  time: string;
  title: string;
  speaker: string;
  description: string;
  tag: string;
};

function session(
  time: string,
  title: string,
  speaker: string,
  description: string,
  tag = '',
): Session {
  return { time, title, speaker, description, tag };
}

export const definition: ComponentDefinition = {
  id: 'content-agenda',
  version: 1,
  name: 'Content, agenda',
  category: 'content',
  description: 'A schedule grouped by day, with times, sessions, speakers and labels.',
  tags: ['agenda', 'schedule', 'program', 'event', 'conference', 'timetable', 'sessions'],
  fieldGroups: ['Heading', 'Days'],
  styleOverrides: ['--color-background', '--color-text', '--section-padding-y'],
  fields: [
    {
      name: 'eyebrow',
      label: 'Eyebrow',
      type: 'text',
      default: 'Fieldnote Research Summit 2026',
      group: 'Heading',
    },
    {
      name: 'title',
      label: 'Title',
      type: 'text',
      default: 'Two days with the people who talk to customers for a living',
      required: true,
      group: 'Heading',
    },
    {
      name: 'intro',
      label: 'Intro',
      type: 'textarea',
      default:
        'Talks, panels and hands-on workshops for product researchers, designers and PMs. Every session is recorded for ticket holders.',
      group: 'Heading',
    },
    {
      name: 'days',
      label: 'Days',
      type: 'list',
      group: 'Days',
      minItems: 1,
      maxItems: 7,
      itemLabel: 'label',
      itemFields: [
        { name: 'label', label: 'Day', type: 'text', default: 'Day' },
        {
          name: 'note',
          label: 'Note',
          type: 'text',
          default: '',
        },
        {
          name: 'sessions',
          label: 'Sessions',
          type: 'list',
          minItems: 1,
          maxItems: 20,
          itemLabel: 'title',
          itemFields: [
            { name: 'time', label: 'Time', type: 'text', default: '09:00' },
            { name: 'title', label: 'Title', type: 'text', default: 'Session' },
            { name: 'speaker', label: 'Speaker', type: 'text', default: '' },
            { name: 'description', label: 'Description', type: 'textarea', default: '' },
            {
              name: 'tag',
              label: 'Tag',
              type: 'text',
              default: '',
            },
          ],
          default: [session('09:00', 'Session', '', '')],
        },
      ],
      default: [
        {
          label: 'Thursday, 15 October',
          note: 'Main hall',
          sessions: [
            session(
              '08:30',
              'Registration and coffee',
              '',
              'Pick up your badge and meet the people who also tag transcripts for a living.',
            ),
            session(
              '09:30',
              'Research that changes the roadmap',
              'Priya Raman, Fieldnote',
              'Why most insights die in a slide deck, and three habits of teams whose research actually ships.',
              'Keynote',
            ),
            session(
              '10:30',
              'Recruiting the customers you never hear from',
              'Sofia Alvarez, Brightpath',
              'How Brightpath reached churned and low-usage customers, and what they said that power users never would.',
              'Talk',
            ),
            session(
              '11:30',
              'Who owns research when everyone does it?',
              'Jonas Becker, Northwind and Amara Osei, Ledgerly',
              'Research leads on guardrails, coaching and keeping quality high when product managers run their own interviews.',
              'Panel',
            ),
            session(
              '12:30',
              'Lunch',
              '',
              'Tables are grouped by topic, so the conversation can keep going.',
            ),
          ],
        },
        {
          label: 'Friday, 16 October',
          note: 'Workshop rooms A and B',
          sessions: [
            session(
              '09:30',
              'From twelve interviews to five themes in a morning',
              'Fieldnote research team',
              'Bring your own transcripts or use our sample study. Laptops required, 40 seats.',
              'Workshop',
            ),
            session(
              '11:00',
              'Writing discussion guides that do not lead',
              'Marcus Lee, Northwind',
              'Rewrite real questions from real guides, and learn the five patterns that bias answers.',
              'Workshop',
            ),
            session(
              '14:00',
              'Five years of continuous discovery',
              'Tom Okafor, Ledgerly',
              'What changed when Ledgerly committed to talking to customers every week, and what it cost.',
              'Keynote',
            ),
          ],
        },
      ],
    },
  ],
};
