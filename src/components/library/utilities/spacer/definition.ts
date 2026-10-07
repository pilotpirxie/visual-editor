import type { ComponentDefinition } from '../../../types';

export const definition: ComponentDefinition = {
  id: 'spacer',
  version: 1,
  name: 'Utilities, spacer',
  category: 'utilities',
  description: 'Empty vertical space between two blocks, sized from the spacing scale.',
  tags: ['spacer', 'space', 'gap', 'whitespace', 'padding', 'utility'],
  fieldGroups: ['Layout'],
  styleOverrides: ['--color-background'],
  fields: [
    {
      name: 'size',
      label: 'Height',
      type: 'select',
      default: 'medium',
      group: 'Layout',
      options: [
        { value: 'small', label: 'Small' },
        { value: 'medium', label: 'Medium' },
        { value: 'large', label: 'Large' },
        { value: 'section', label: 'Same as section padding' },
      ],
    },
  ],
};
