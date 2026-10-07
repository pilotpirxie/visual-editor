import type { ComponentDefinition } from '../../../types';

type Question = { question: string; answer: string };

function qa(question: string, answer: string): Question {
  return { question, answer: `<p>${answer}</p>` };
}

export const definition: ComponentDefinition = {
  id: 'faq-two-columns',
  version: 1,
  name: 'FAQ, two columns',
  category: 'faq',
  description: 'A heading, an intro and questions in two columns that open one at a time.',
  tags: ['faq', 'questions', 'accordion', 'help', 'answers', 'columns'],
  fieldGroups: ['Heading', 'Questions'],
  styleOverrides: ['--color-background', '--color-text', '--section-padding-y'],
  fields: [
    { name: 'eyebrow', label: 'Eyebrow', type: 'text', default: 'FAQ', group: 'Heading' },
    {
      name: 'title',
      label: 'Title',
      type: 'text',
      default: 'Answers before you book a demo',
      required: true,
      group: 'Heading',
    },
    {
      name: 'intro',
      label: 'Intro',
      type: 'textarea',
      default:
        'The questions research and security teams ask us most. Something missing? Write to support@fieldnote.example.',
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
      maxItems: 24,
      itemLabel: 'question',
      itemFields: [
        { name: 'question', label: 'Question', type: 'text', default: 'A question?' },
        { name: 'answer', label: 'Answer', type: 'richtext', default: '<p>The answer.</p>' },
      ],
      default: [
        qa(
          'Do customers know they are being recorded?',
          'Yes. Fieldnote announces itself when it joins a call, and you can send a consent note with every invite.',
        ),
        qa(
          'Which calling tools does Fieldnote work with?',
          'Zoom, Google Meet and Microsoft Teams. For in-person interviews, record with our phone app or upload the file.',
        ),
        qa(
          'How accurate are the transcripts?',
          'Around 95% for clear audio in English, with speaker labels. You can fix any line, and the clip timing follows your edit.',
        ),
        qa(
          'Where is our data stored?',
          'In the region you choose: the EU, the US or Canada. Recordings are encrypted at rest and in transit.',
        ),
        qa(
          'Can we import interviews we already recorded?',
          'Drop in audio or video files, or connect your cloud drive. Past interviews are transcribed and tagged like new ones.',
        ),
        qa(
          'Can personal details be removed from transcripts?',
          'Turn on redaction per project, and names, emails, phone numbers and card numbers are masked before anyone reads them.',
        ),
        qa(
          'Who counts as an editor?',
          'Anyone who tags, writes or uploads. People who only read reports and watch clips are viewers, and viewers are free.',
        ),
        qa(
          'What happens when the trial ends?',
          'Nothing is deleted. Pick a plan to keep editing, or stay on Starter to keep reading what you have.',
        ),
      ],
    },
  ],
};
