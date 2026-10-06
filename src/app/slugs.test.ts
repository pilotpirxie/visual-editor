import { describe, expect, it } from 'vitest';
import { slugError, slugify, uniqueSlug } from './slugs';

describe('slugify', () => {
  it.each([
    ['About us', 'about-us'],
    ['  Pricing & Plans! ', 'pricing-plans'],
    ['Café Crème', 'cafe-creme'],
    ['404', '404'],
    ['---', 'page'],
    ['日本', 'page'],
  ])('turns %j into %j', (name, slug) => {
    expect(slugify(name)).toBe(slug);
  });
});

describe('uniqueSlug', () => {
  it('keeps a free slug', () => {
    expect(uniqueSlug('About', ['home'])).toBe('about');
  });

  it('adds the first free number when the slug is taken', () => {
    expect(uniqueSlug('About', ['about', 'about-2'])).toBe('about-3');
  });

  it('never returns the slug reserved for the home page file', () => {
    expect(uniqueSlug('Index', [])).toBe('index-2');
  });
});

describe('slugError', () => {
  it('accepts lowercase words joined by single hyphens', () => {
    expect(slugError('our-team-2', ['home'])).toBeNull();
  });

  it.each([
    ['', 'Enter a slug'],
    ['Our Team', 'Use lowercase letters, digits and single hyphens'],
    ['our--team', 'Use lowercase letters, digits and single hyphens'],
    ['-team', 'Use lowercase letters, digits and single hyphens'],
    ['index', '“index” is reserved for the home page file'],
    ['home', 'Another page already uses this slug'],
  ])('rejects %j', (slug, message) => {
    expect(slugError(slug, ['home'])).toBe(message);
  });
});
