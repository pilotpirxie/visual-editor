import type { ComponentDefinition, ImageValue } from '../../../types';

type GalleryRatio = '1:1' | '3:4' | '4:3' | '3:2';

type GalleryItem = { image: ImageValue; caption: string };

const RATIO_SIZES: Record<GalleryRatio, { width: number; height: number }> = {
  '1:1': { width: 1200, height: 1200 },
  '3:4': { width: 900, height: 1200 },
  '4:3': { width: 1200, height: 900 },
  '3:2': { width: 1200, height: 800 },
};

function photo(alt: string, ratio: GalleryRatio): ImageValue {
  return {
    source: 'placeholder',
    src: '',
    alt,
    decorative: false,
    ...RATIO_SIZES[ratio],
    placeholder: { ratio, subject: 'photo' },
  };
}

function galleryItem(caption: string, alt: string, ratio: GalleryRatio): GalleryItem {
  return { image: photo(alt, ratio), caption };
}

export const definition: ComponentDefinition = {
  id: 'gallery-masonry',
  version: 1,
  name: 'Gallery, masonry',
  category: 'gallery',
  description: 'A heading and photos of mixed shapes stacked in columns, with optional captions.',
  tags: ['gallery', 'photos', 'images', 'masonry', 'columns', 'portfolio'],
  fieldGroups: ['Heading', 'Photos'],
  styleOverrides: ['--color-background', '--color-text', '--section-padding-y'],
  fields: [
    { name: 'eyebrow', label: 'Eyebrow', type: 'text', default: 'Research week', group: 'Heading' },
    {
      name: 'title',
      label: 'Title',
      type: 'text',
      default: 'Notes from the field',
      required: true,
      maxLength: 120,
      group: 'Heading',
    },
    {
      name: 'intro',
      label: 'Intro',
      type: 'textarea',
      default:
        'Our team spent a week with customers at Northwind, Brightpath and Ledgerly. A few moments from the visits.',
      group: 'Heading',
    },
    {
      name: 'items',
      label: 'Photos',
      type: 'list',
      group: 'Photos',
      minItems: 2,
      maxItems: 12,
      itemLabel: 'caption',
      itemFields: [
        { name: 'image', label: 'Photo', type: 'image', default: photo('Photo', '4:3') },
        { name: 'caption', label: 'Caption', type: 'text', default: '' },
      ],
      default: [
        galleryItem(
          'Usability session at Northwind',
          'Ingrid Solberg watching a Northwind customer work through a prototype on a laptop',
          '4:3',
        ),
        galleryItem(
          'Affinity mapping after day two',
          'A wall of sticky notes grouped into onboarding themes',
          '3:4',
        ),
        galleryItem(
          'Tagging highlights between calls',
          'Jonas Becker tagging interview highlights in Fieldnote',
          '1:1',
        ),
        galleryItem(
          'Mapping the journey at Ledgerly',
          'Priya Raman sketching a customer journey on a whiteboard',
          '3:4',
        ),
        galleryItem(
          'Our in-person recording kit',
          'A phone on a small tripod next to a notebook and a consent form',
          '4:3',
        ),
        galleryItem(
          'Group interview with Brightpath support',
          'Four members of the Brightpath support team talking around a table',
          '3:2',
        ),
        galleryItem(
          'Quotes that made the roadmap',
          'Printed customer quotes pinned to a board in the Fieldnote office',
          '3:4',
        ),
        galleryItem(
          'Ride-along with Ledgerly finance',
          'A finance lead walking through a month-end report on two monitors',
          '3:2',
        ),
        galleryItem(
          'Last-day debrief over lunch',
          'The research team sharing lunch and notes on the final day',
          '1:1',
        ),
      ],
    },
  ],
};
