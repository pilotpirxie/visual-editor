import { describe, expect, it } from 'vitest';
import { builtInComponents } from '../../components/registry';
import { filterComponents } from './search';

const components = [...builtInComponents.values()];
function ids(query: string): string[] {
  return filterComponents(components, query).map(({ definition }) => definition.id);
}

describe('filterComponents', () => {
  it('returns everything for an empty query', () => {
    expect(ids('   ')).toHaveLength(components.length);
  });

  it('matches names, tags and category labels, ignoring case', () => {
    expect(ids('FOOTER')).toEqual([
      'footer-centered',
      'footer-columns',
      'footer-newsletter',
      'footer-simple',
    ]);
    expect(ids('navbar')).toEqual([
      'nav-app',
      'nav-centered',
      'nav-contact',
      'nav-cta',
      'nav-docs',
      'nav-drawer',
      'nav-dropdown',
      'nav-edge-cta',
      'nav-editorial',
      'nav-event',
      'nav-language',
      'nav-logo-image',
      'nav-mega',
      'nav-minimal',
      'nav-overlay',
      'nav-pill',
      'nav-search',
      'nav-shop',
      'nav-simple',
      'nav-social',
      'nav-split',
      'nav-sticky',
      'nav-subnav',
      'nav-topbar',
    ]);
    expect(ids('call to action')).toEqual([
      'app-banner',
      'cta-banner',
      'cta-centered',
      'cta-image',
      'cta-two-buttons',
      'steps-cta',
    ]);
  });

  it('requires every word to match', () => {
    expect(ids('grid icons')).toEqual([
      'features-bento',
      'features-grid-3',
      'features-quote',
      'steps-cards',
    ]);
    expect(ids('grid pricing')).toEqual([]);
  });
});
