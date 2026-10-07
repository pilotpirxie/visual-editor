import type { ComponentDefinition } from '../../../types';

export const definition: ComponentDefinition = {
  id: 'stats-row',
  version: 1,
  name: 'Numbers, stats row',
  category: 'numbers',
  description: 'A row of big numbers with short labels.',
  tags: ['numbers', 'stats', 'metrics', 'results', 'kpi'],
  fieldGroups: ['Numbers'],
  styleOverrides: ['--color-background', '--color-text', '--section-padding-y'],
  fields: [
    {
      name: 'stats',
      label: 'Numbers',
      type: 'list',
      group: 'Numbers',
      minItems: 1,
      maxItems: 6,
      itemLabel: 'label',
      itemFields: [
        { name: 'value', label: 'Number', type: 'text', default: '100' },
        { name: 'label', label: 'Label', type: 'text', default: 'Label' },
      ],
      default: [
        { value: '12,000+', label: 'Interviews analyzed' },
        { value: '6 hrs', label: 'Saved per study' },
        { value: '30', label: 'Languages transcribed' },
        { value: '4.8/5', label: 'Average review score' },
      ],
    },
  ],
};
