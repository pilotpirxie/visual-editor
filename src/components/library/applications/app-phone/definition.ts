import type { ComponentDefinition, ImageValue } from '../../../types';

function screenshot(alt: string): ImageValue {
  return {
    source: 'placeholder',
    src: '',
    alt,
    decorative: false,
    width: 900,
    height: 1200,
    placeholder: { ratio: '3:4', subject: 'screenshot' },
  };
}

export const definition: ComponentDefinition = {
  id: 'app-phone',
  version: 1,
  name: 'Applications, phone with features',
  category: 'applications',
  description: 'An app screenshot in a phone frame next to a heading and a short list of features.',
  tags: ['app', 'mobile', 'phone', 'mockup', 'screenshot', 'features', 'ios', 'android'],
  fieldGroups: ['Heading', 'Screenshot', 'Features', 'Button'],
  styleOverrides: ['--color-background', '--color-text', '--section-padding-y'],
  fields: [
    {
      name: 'eyebrow',
      label: 'Eyebrow',
      type: 'text',
      default: 'Fieldnote for iOS and Android',
      group: 'Heading',
    },
    {
      name: 'title',
      label: 'Title',
      type: 'text',
      default: 'Run interviews from anywhere, not just your desk',
      required: true,
      maxLength: 120,
      group: 'Heading',
    },
    {
      name: 'intro',
      label: 'Intro',
      type: 'textarea',
      default:
        'Record in-person sessions on your phone and find them transcribed and tagged in your workspace before you are back at the office.',
      group: 'Heading',
    },
    {
      name: 'screenshot',
      label: 'Screenshot',
      type: 'image',
      default: screenshot('The Fieldnote app recording an interview with a live transcript'),
      group: 'Screenshot',
    },
    {
      name: 'items',
      label: 'Features',
      type: 'list',
      group: 'Features',
      minItems: 1,
      maxItems: 4,
      itemLabel: 'title',
      itemFields: [
        { name: 'icon', label: 'Icon', type: 'icon', default: 'smartphone' },
        { name: 'title', label: 'Title', type: 'text', default: 'Feature title' },
        {
          name: 'text',
          label: 'Text',
          type: 'textarea',
          default: 'Describe the benefit in one sentence.',
        },
      ],
      default: [
        {
          icon: 'mic',
          title: 'One-tap recording',
          text: 'Start recording from your lock screen. Audio keeps going through phone calls and patchy signal.',
        },
        {
          icon: 'transcript',
          title: 'Live transcript',
          text: 'Follow the conversation as text and tap once to mark the moments your team needs to hear.',
        },
        {
          icon: 'tag',
          title: 'Your team’s tags',
          text: 'Tag highlights with the same tags you use on desktop, so every finding lands in the right theme.',
        },
      ],
    },
    {
      name: 'showButton',
      label: 'Show button',
      type: 'boolean',
      default: true,
      group: 'Button',
    },
    {
      name: 'button',
      label: 'Button',
      type: 'button',
      default: {
        label: 'Get the app',
        link: { type: 'url', url: '#', newTab: false },
        variant: 'primary',
      },
      visibleWhen: { field: 'showButton', equals: true },
      group: 'Button',
    },
  ],
};
