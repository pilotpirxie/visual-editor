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
  iconPurpose?: 'logo' | 'brand';
  allowHeadings?: boolean;
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
  migrate?: (values: Record<string, unknown>, fromVersion: number) => Record<string, unknown>;
};

export const LINK_TYPES = ['page', 'section', 'url', 'email', 'phone'] as const;

export type LinkType = (typeof LINK_TYPES)[number];

export const BUTTON_VARIANTS = ['primary', 'secondary', 'ghost'] as const;

export type ButtonVariant = (typeof BUTTON_VARIANTS)[number];

export type LinkValue = {
  type: LinkType;
  pageId?: string;
  anchor?: string;
  url?: string;
  newTab: boolean;
};

export type ButtonValue = {
  label: string;
  link: LinkValue;
  variant: ButtonVariant;
};

export type RegisteredComponent = {
  definition: ComponentDefinition;
  template: TemplateDelegate;
  styles: string;
  thumbnail: string;
  isCustom: boolean;
};

export type PackInfo = {
  id: string;
  name: string;
  version: string;
  author: string;
  license: string;
};

export type CustomDefinition = {
  pack: PackInfo;
  definition: ComponentDefinition;
  template: string;
  styles: string;
  thumbnail: string;
  fieldRenames: Record<string, string>;
};

export type BlockPack = PackInfo & { blocks: CustomDefinition[]; isPartial: boolean };

export const PLACEHOLDER_RATIOS = ['1:1', '4:3', '3:2', '16:9', '3:4', '21:9'] as const;

export type PlaceholderRatio = (typeof PLACEHOLDER_RATIOS)[number];

export const PLACEHOLDER_SUBJECTS = ['photo', 'person', 'product', 'logo', 'screenshot'] as const;

export type PlaceholderSubject = (typeof PLACEHOLDER_SUBJECTS)[number];

export type ImageValue = {
  source: 'placeholder';
  src: string;
  alt: string;
  decorative: boolean;
  width: number;
  height: number;
  placeholder: { ratio: PlaceholderRatio; subject: PlaceholderSubject };
};
