import type { ComponentDefinition, ImageValue } from '../../../types';

function logo(company: string): ImageValue {
  return {
    source: 'placeholder',
    src: '',
    alt: company,
    decorative: false,
    width: 1200,
    height: 514,
    placeholder: { ratio: '21:9', subject: 'logo' },
  };
}

export const definition: ComponentDefinition = {
  id: 'logos-heading',
  version: 1,
  name: 'Logo cloud, with heading',
  category: 'logo-clouds',
  description: 'A heading and a sentence next to a grid of customer logos.',
  tags: ['logos', 'customers', 'trusted by', 'brands', 'social proof', 'heading'],
  fieldGroups: ['Heading', 'Logos'],
  styleOverrides: ['--color-background', '--color-text', '--section-padding-y'],
  fields: [
    { name: 'eyebrow', label: 'Eyebrow', type: 'text', default: 'Customers', group: 'Heading' },
    {
      name: 'title',
      label: 'Title',
      type: 'text',
      default: 'Trusted by teams who talk to customers every week',
      required: true,
      group: 'Heading',
    },
    {
      name: 'text',
      label: 'Text',
      type: 'textarea',
      default:
        'More than 900 product teams use Fieldnote to record, tag and share what they hear in customer interviews.',
      group: 'Heading',
    },
    {
      name: 'logos',
      label: 'Logos',
      type: 'list',
      group: 'Logos',
      minItems: 1,
      maxItems: 12,
      itemLabel: 'company',
      itemFields: [
        { name: 'company', label: 'Company', type: 'text', default: 'Company' },
        { name: 'image', label: 'Logo', type: 'image', default: logo('Company logo') },
      ],
      default: [
        { company: 'Northwind', image: logo('Northwind') },
        { company: 'Brightpath', image: logo('Brightpath') },
        { company: 'Ledgerly', image: logo('Ledgerly') },
        { company: 'Lumen Health', image: logo('Lumen Health') },
        { company: 'Orbit Labs', image: logo('Orbit Labs') },
        { company: 'Copperline', image: logo('Copperline') },
      ],
    },
  ],
};
