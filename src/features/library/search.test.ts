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
      'footer-app',
      'footer-badges',
      'footer-bar',
      'footer-card',
      'footer-centered',
      'footer-columns',
      'footer-contact',
      'footer-cta',
      'footer-dark',
      'footer-docs',
      'footer-event',
      'footer-fineprint',
      'footer-local',
      'footer-map',
      'footer-mega',
      'footer-newsletter',
      'footer-offices',
      'footer-photos',
      'footer-portfolio',
      'footer-posts',
      'footer-rows',
      'footer-shop',
      'footer-simple',
      'footer-sitemap',
      'footer-social',
      'footer-split',
      'footer-statement',
      'footer-status',
      'footer-top',
      'footer-wordmark',
    ]);
    expect(ids('navbar')).toEqual([
      'nav-account',
      'nav-announcement',
      'nav-app',
      'nav-bottom',
      'nav-boxed',
      'nav-centered',
      'nav-contact',
      'nav-cta',
      'nav-docs',
      'nav-drawer',
      'nav-dropdown',
      'nav-edge-cta',
      'nav-editorial',
      'nav-event',
      'nav-icons',
      'nav-index',
      'nav-language',
      'nav-logo-image',
      'nav-mega',
      'nav-minimal',
      'nav-overlay',
      'nav-pill',
      'nav-portfolio',
      'nav-search',
      'nav-shop',
      'nav-simple',
      'nav-social',
      'nav-split',
      'nav-stacked',
      'nav-status',
      'nav-sticky',
      'nav-subnav',
      'nav-tabs',
      'nav-topbar',
    ]);
    expect(ids('call to action')).toEqual([
      'app-banner',
      'cta-avatars',
      'cta-background',
      'cta-banner',
      'cta-big-link',
      'cta-calendar',
      'cta-card',
      'cta-centered',
      'cta-checklist',
      'cta-command',
      'cta-countdown',
      'cta-dark',
      'cta-download',
      'cta-email',
      'cta-gradient',
      'cta-guarantee',
      'cta-image',
      'cta-logos',
      'cta-minimal',
      'cta-overlap',
      'cta-phone',
      'cta-price',
      'cta-quote',
      'cta-roles',
      'cta-sales',
      'cta-scattered',
      'cta-split',
      'cta-stats',
      'cta-stripes',
      'cta-ticket',
      'cta-two-buttons',
      'cta-two-cards',
      'cta-video',
      'footer-cta',
      'footer-statement',
      'steps-cta',
    ]);
  });

  it('requires every word to match', () => {
    expect(ids('grid icons')).toEqual([
      'faq-cards',
      'features-bento',
      'features-grid-3',
      'features-icon-wall',
      'features-quote',
      'features-tiles',
      'nav-icons',
      'steps-cards',
    ]);
    expect(ids('grid pricing')).toEqual([]);
  });
});
