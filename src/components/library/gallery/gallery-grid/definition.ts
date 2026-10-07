import type { ComponentDefinition, ImageValue } from '../../../types';

type GalleryItem = { image: ImageValue; caption: string };

function photo(alt: string): ImageValue {
  return {
    source: 'placeholder',
    src: '',
    alt,
    decorative: false,
    width: 1200,
    height: 900,
    placeholder: { ratio: '4:3', subject: 'photo' },
  };
}

function galleryItem(caption: string, alt: string): GalleryItem {
  return { image: photo(alt), caption };
}

export const definition: ComponentDefinition = {
  id: 'gallery-grid',
  version: 1,
  name: 'Gallery, uniform grid',
  category: 'gallery',
  description: 'A heading and an even grid of same-shape photos with optional captions.',
  tags: ['gallery', 'photos', 'images', 'grid', 'event', 'portfolio'],
  fieldGroups: ['Heading', 'Photos', 'Layout'],
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
      default: 'Two days of talks and workshops in Berlin',
      required: true,
      maxLength: 120,
      group: 'Heading',
    },
    {
      name: 'intro',
      label: 'Intro',
      type: 'textarea',
      default:
        'Three hundred researchers, designers and product managers met to swap methods, war stories and interview tips. Here is what it looked like.',
      group: 'Heading',
    },
    {
      name: 'items',
      label: 'Photos',
      type: 'list',
      group: 'Photos',
      minItems: 1,
      maxItems: 16,
      itemLabel: 'caption',
      itemFields: [
        { name: 'image', label: 'Photo', type: 'image', default: photo('Photo') },
        { name: 'caption', label: 'Caption', type: 'text', default: '' },
      ],
      default: [
        galleryItem(
          'Priya Raman opens the summit',
          'Priya Raman on stage in front of a full auditorium',
        ),
        galleryItem(
          'Workshop: synthesis in an afternoon',
          'Workshop tables covered in printed transcripts and sticky notes',
        ),
        galleryItem(
          'Jonas Becker on research for engineers',
          'Jonas Becker presenting a slide of interview clips',
        ),
        galleryItem(
          'Customer panel with Northwind and Ledgerly',
          'Four panelists seated on stage answering audience questions',
        ),
        galleryItem(
          'Live tagging demo on the main stage',
          'A large screen showing highlights being tagged during a live interview',
        ),
        galleryItem(
          'Hallway conversations between sessions',
          'Attendees talking in small groups in a sunlit hallway',
        ),
      ],
    },
    {
      name: 'ratio',
      label: 'Photo shape',
      type: 'select',
      default: 'landscape',
      group: 'Layout',
      options: [
        { value: 'square', label: 'Square' },
        { value: 'landscape', label: 'Landscape 4:3' },
        { value: 'portrait', label: 'Portrait 3:4' },
      ],
    },
    {
      name: 'columns',
      label: 'Columns on desktop',
      type: 'select',
      default: '3',
      group: 'Layout',
      options: [
        { value: '2', label: '2' },
        { value: '3', label: '3' },
        { value: '4', label: '4' },
      ],
    },
  ],
};
