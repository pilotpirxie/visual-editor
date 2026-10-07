import { describe, expect, it } from 'vitest';
import { registry } from '../../components/registry';
import { filterComponents } from './search';

const components = [...registry.values()];
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
    expect(ids('navbar')).toEqual(['nav-centered', 'nav-cta', 'nav-dropdown', 'nav-simple']);
    expect(ids('call to action')).toEqual([
      'cta-banner',
      'cta-centered',
      'cta-image',
      'cta-two-buttons',
    ]);
  });

  it('requires every word to match', () => {
    expect(ids('grid icons')).toEqual(['features-bento', 'features-grid-3']);
    expect(ids('grid pricing')).toEqual([]);
  });
});
