import type { ComponentDefinition, ImageValue } from '../../../types';

type Screen = { image: ImageValue; caption: string };

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

function screen(caption: string, alt: string): Screen {
  return { image: screenshot(alt), caption };
}

export const definition: ComponentDefinition = {
  id: 'app-screenshots',
  version: 1,
  name: 'Applications, screenshot gallery',
  category: 'applications',
  description: 'A heading and a row of app screenshots in phone frames, each with a caption.',
  tags: ['app', 'mobile', 'screenshots', 'gallery', 'phone', 'screens'],
  fieldGroups: ['Heading', 'Screenshots'],
  styleOverrides: ['--color-background', '--color-text', '--section-padding-y'],
  fields: [
    {
      name: 'eyebrow',
      label: 'Eyebrow',
      type: 'text',
      default: 'Inside the app',
      group: 'Heading',
    },
    {
      name: 'title',
      label: 'Title',
      type: 'text',
      default: 'Everything you need between interviews',
      required: true,
      maxLength: 120,
      group: 'Heading',
    },
    {
      name: 'intro',
      label: 'Intro',
      type: 'textarea',
      default:
        'The screens product teams reach for most when they are away from their desks, on iOS and Android.',
      group: 'Heading',
    },
    {
      name: 'items',
      label: 'Screenshots',
      type: 'list',
      group: 'Screenshots',
      minItems: 3,
      maxItems: 6,
      itemLabel: 'caption',
      itemFields: [
        {
          name: 'image',
          label: 'Screenshot',
          type: 'image',
          default: screenshot('A screen of the Fieldnote app'),
        },
        { name: 'caption', label: 'Caption', type: 'text', default: 'What this screen does' },
      ],
      default: [
        screen(
          'Record with one tap',
          'Recording screen with a large record button and a running session timer',
        ),
        screen(
          'Mark highlights live',
          'Live transcript with a customer quote highlighted in the middle of the screen',
        ),
        screen('Tag on the go', 'Tag picker listing the team’s research tags for onboarding'),
        screen(
          'Search every interview',
          'Search results for the word onboarding across a dozen interviews',
        ),
      ],
    },
  ],
};
