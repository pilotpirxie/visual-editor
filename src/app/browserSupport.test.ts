import { describe, expect, it } from 'vitest';
import { browserFeatureChecks, missingFeatures } from './browserSupport';

describe('missingFeatures', () => {
  it('lists the names of unsupported features in order', () => {
    expect(
      missingFeatures([
        { name: 'dialogs', isSupported: true },
        { name: 'popovers', isSupported: false },
        { name: 'CSS @scope', isSupported: false },
      ]),
    ).toEqual(['popovers', 'CSS @scope']);
  });

  it('checks every feature the editor relies on', () => {
    expect(browserFeatureChecks().map((check) => check.name)).toEqual([
      'dialogs',
      'popovers',
      'structured cloning',
      'browser storage',
      'compression streams',
      'random ids',
      'CSS @scope',
      'CSS :has()',
    ]);
  });
});
