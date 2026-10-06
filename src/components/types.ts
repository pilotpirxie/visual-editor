import type { TemplateDelegate } from 'handlebars';

export const CATEGORIES = [
  { id: 'navigations', label: 'Navigations' },
  { id: 'banners', label: 'Banners' },
  { id: 'headers', label: 'Headers' },
  { id: 'features', label: 'Features' },
  { id: 'how-it-works', label: 'How it works' },
  { id: 'pricing', label: 'Pricing' },
  { id: 'testimonials', label: 'Testimonials' },
  { id: 'logo-clouds', label: 'Logo clouds' },
  { id: 'numbers', label: 'Numbers' },
  { id: 'applications', label: 'Applications showcase' },
  { id: 'gallery', label: 'Gallery' },
  { id: 'content', label: 'Content' },
  { id: 'rich-text', label: 'Rich text' },
  { id: 'blog', label: 'Blog posts' },
  { id: 'team', label: 'Team' },
  { id: 'careers', label: 'Careers' },
  { id: 'faq', label: 'FAQ' },
  { id: 'contacts', label: 'Contacts' },
  { id: 'newsletters', label: 'Newsletters' },
  { id: 'call-to-action', label: 'Call to action' },
  { id: 'sign-in', label: 'Sign in' },
  { id: 'sign-up', label: 'Sign up' },
  { id: 'footers', label: 'Footers' },
  { id: 'modals', label: 'Modals' },
  { id: 'cookies', label: 'Cookies' },
  { id: 'http-codes', label: 'HTTP codes' },
  { id: 'utilities', label: 'Utilities' },
] as const;

export type Category = (typeof CATEGORIES)[number]['id'];

export type FieldType =
  | 'text'
  | 'textarea'
  | 'richtext'
  | 'number'
  | 'range'
  | 'boolean'
  | 'select'
  | 'segmented'
  | 'color'
  | 'image'
  | 'icon'
  | 'link'
  | 'button'
  | 'list'
  | 'date';

export type FieldOption = { value: string; label: string; icon?: string };

export type Field = {
  name: string;
  label: string;
  type: FieldType;
  default: unknown;
  group?: string;
  help?: string;
  required?: boolean;
  options?: FieldOption[];
  min?: number;
  max?: number;
  step?: number;
  maxLength?: number;
  visibleWhen?: { field: string; equals: unknown };
  itemFields?: Field[];
  minItems?: number;
  maxItems?: number;
  itemLabel?: string;
};

export type ComponentDefinition = {
  id: string;
  version: number;
  name: string;
  category: Category;
  description?: string;
  tags?: string[];
  fieldGroups?: string[];
  fields: Field[];
  styleOverrides: string[];
  behaviors?: string[];
};

export type LinkValue = {
  type: 'page' | 'section' | 'url' | 'email' | 'phone';
  pageId?: string;
  anchor?: string;
  url?: string;
  newTab: boolean;
};

export type ButtonValue = {
  label: string;
  link: LinkValue;
  variant: 'primary' | 'secondary' | 'ghost';
};

export type RegisteredComponent = {
  definition: ComponentDefinition;
  template: TemplateDelegate;
  styles: string;
  thumbnail: string;
};
