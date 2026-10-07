import type { ComponentDefinition, ImageValue, LinkValue } from '../../../types';

const HASH: LinkValue = { type: 'url', url: '#', newTab: false };

function tallPhoto(alt: string): ImageValue {
  return {
    source: 'placeholder',
    src: '',
    alt,
    decorative: false,
    width: 900,
    height: 1200,
    placeholder: { ratio: '3:4', subject: 'photo' },
  };
}

export const definition: ComponentDefinition = {
  id: 'signin-split',
  version: 1,
  name: 'Sign in, split with image',
  category: 'sign-in',
  description: 'A sign-in form beside a tall image with an optional customer quote on top.',
  tags: ['sign in', 'login', 'log in', 'account', 'password', 'form', 'image', 'split', 'quote'],
  fieldGroups: ['Heading', 'Form', 'Links', 'Image'],
  styleOverrides: ['--color-background', '--color-text', '--section-padding-y'],
  fields: [
    {
      name: 'title',
      label: 'Title',
      type: 'text',
      default: 'Welcome back',
      required: true,
      group: 'Heading',
    },
    {
      name: 'text',
      label: 'Text',
      type: 'textarea',
      default: 'Sign in to see the highlights from this week’s interviews.',
      group: 'Heading',
    },
    {
      name: 'emailLabel',
      label: 'Email field label',
      type: 'text',
      default: 'Work email',
      required: true,
      group: 'Form',
    },
    {
      name: 'passwordLabel',
      label: 'Password field label',
      type: 'text',
      default: 'Password',
      required: true,
      group: 'Form',
    },
    {
      name: 'rememberLabel',
      label: 'Remember me label',
      type: 'text',
      default: 'Remember me',
      required: true,
      group: 'Form',
    },
    {
      name: 'buttonLabel',
      label: 'Button label',
      type: 'text',
      default: 'Sign in',
      required: true,
      group: 'Form',
    },
    {
      name: 'formAction',
      label: 'Form action URL',
      type: 'text',
      default: '',
      group: 'Form',
    },
    {
      name: 'formMethod',
      label: 'Method',
      type: 'select',
      default: 'post',
      options: [
        { value: 'post', label: 'POST' },
        { value: 'get', label: 'GET' },
      ],
      group: 'Form',
    },
    {
      name: 'forgotLabel',
      label: 'Forgot password label',
      type: 'text',
      default: 'Forgot your password?',
      group: 'Links',
    },
    {
      name: 'forgotLink',
      label: 'Forgot password link',
      type: 'link',
      default: HASH,
      group: 'Links',
    },
    {
      name: 'signUpText',
      label: 'Sign up text',
      type: 'text',
      default: 'New to Fieldnote?',
      group: 'Links',
    },
    {
      name: 'signUpLabel',
      label: 'Sign up link label',
      type: 'text',
      default: 'Create an account',
      group: 'Links',
    },
    { name: 'signUpLink', label: 'Sign up link', type: 'link', default: HASH, group: 'Links' },
    {
      name: 'image',
      label: 'Image',
      type: 'image',
      default: tallPhoto(
        'A product team reviewing interview highlights together on a large screen',
      ),
      group: 'Image',
    },
    { name: 'showQuote', label: 'Show quote', type: 'boolean', default: true, group: 'Image' },
    {
      name: 'quote',
      label: 'Quote',
      type: 'textarea',
      default:
        'We cut synthesis from three weeks to three days. Every product review now starts with a Fieldnote clip.',
      visibleWhen: { field: 'showQuote', equals: true },
      group: 'Image',
    },
    {
      name: 'quoteName',
      label: 'Name',
      type: 'text',
      default: 'Priya Raman',
      visibleWhen: { field: 'showQuote', equals: true },
      group: 'Image',
    },
    {
      name: 'quoteRole',
      label: 'Role',
      type: 'text',
      default: 'Head of Research, Northwind',
      visibleWhen: { field: 'showQuote', equals: true },
      group: 'Image',
    },
  ],
};
