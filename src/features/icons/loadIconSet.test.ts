import { describe, expect, it } from 'vitest';
import { resolveIcon } from '../../render/icons';
import { loadIconSet } from './loadIconSet';

describe('loadIconSet', () => {
  it('loads a bundled icon set so its icons can be rendered', async () => {
    await loadIconSet('lucide');
    expect(resolveIcon('lucide:rocket')).not.toBeNull();
  });

  it('can be called again once the set is loaded', async () => {
    await loadIconSet('lucide');
    await expect(loadIconSet('lucide')).resolves.toBeUndefined();
  });

  it('rejects a set that is not bundled every time it is asked for', async () => {
    await expect(loadIconSet('no-such-set')).rejects.toThrow('Unknown icon set "no-such-set"');
    await expect(loadIconSet('no-such-set')).rejects.toThrow('Unknown icon set "no-such-set"');
  });
});
