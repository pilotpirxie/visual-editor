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
  id: 'logos-row',
  version: 1,
  name: 'Logo cloud, row',
  category: 'logo-clouds',
  description: 'A short line of text above a row of customer logos.',
  tags: ['logos', 'customers', 'trusted by', 'brands', 'social proof'],
  fieldGroups: ['Heading', 'Logos'],
  styleOverrides: ['--color-background', '--color-text', '--section-padding-y'],
  fields: [
    {
      name: 'title',
      label: 'Text above the logos',
      type: 'text',
      default: 'Trusted by product teams at',
      group: 'Heading',
    },
    {
      name: 'logos',
      label: 'Logos',
      type: 'list',
      group: 'Logos',
      minItems: 1,
      maxItems: 8,
      itemLabel: 'company',
      itemFields: [
        { name: 'company', label: 'Company', type: 'text', default: 'Company' },
        { name: 'image', label: 'Logo', type: 'image', default: logo('Company logo') },
      ],
      default: [
        { company: 'Lumen Health', image: logo('Lumen Health') },
        { company: 'Northwind', image: logo('Northwind') },
        { company: 'Brightpath', image: logo('Brightpath') },
        { company: 'Ledgerly', image: logo('Ledgerly') },
        { company: 'Orbit Labs', image: logo('Orbit Labs') },
      ],
    },
  ],
};
