export const TEMPLATE_HELPERS = [
  'href',
  'linkAttrs',
  'svgIcon',
  'img',
  'eq',
  'not',
  'and',
  'or',
  'nl2br',
  'richText',
  'safeUrl',
  'formatDate',
] as const;

export type TemplateHelper = (typeof TEMPLATE_HELPERS)[number];

export const BLOCK_HELPERS = ['if', 'unless', 'each'] as const;

export const HANDLEBARS_BUILTIN_HELPERS = [...BLOCK_HELPERS, 'with', 'lookup', 'log'] as const;

export function isTemplateHelper(name: string): name is TemplateHelper {
  return TEMPLATE_HELPERS.some((helper) => helper === name);
}
