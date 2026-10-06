import lucide from 'virtual:icon-set/lucide';
import { describe, expect, it } from 'vitest';
import { parseIconRef, registerIconSet, resolveIcon, searchIcons } from './icons';

registerIconSet('demo', {
  width: 24,
  height: 24,
  icons: {
    rocket: { body: '<path d="M1 1"/>' },
    'rocket-launch': { body: '<path d="M2 2"/>' },
    'paper-rocket': { body: '<path d="M3 3"/>' },
    wide: { body: '<path d="M4 4"/>', width: 32 },
    'old-rocket': { body: '<path d="M5 5"/>', hidden: true },
  },
  aliases: { launch: 'rocket-launch', ship: 'paper-rocket' },
});

describe('icon sets', () => {
  it('parses bare names as the default set and set:name as a fixed pick', () => {
    expect(parseIconRef('zap')).toEqual({ set: 'lucide', name: 'zap' });
    expect(parseIconRef('demo:rocket')).toEqual({ set: 'demo', name: 'rocket' });
  });

  it('resolves icons, aliases and per-icon sizes', () => {
    expect(resolveIcon('demo:launch')?.body).toBe('<path d="M2 2"/>');
    expect(resolveIcon('demo:wide')).toEqual({ body: '<path d="M4 4"/>', width: 32, height: 24 });
    expect(resolveIcon('demo:missing')).toBeNull();
    expect(resolveIcon('unknown-set:rocket')).toBeNull();
  });

  it('ranks exact matches, then prefixes, then partial matches, counting aliases', () => {
    expect(searchIcons('demo', 'rocket')).toEqual(['rocket', 'rocket-launch', 'paper-rocket']);
    expect(searchIcons('demo', 'launch')).toEqual(['rocket-launch']);
    expect(searchIcons('demo', ' Paper Rocket ')).toEqual(['paper-rocket']);
    expect(searchIcons('demo', '')).toHaveLength(4);
    expect(resolveIcon('demo:old-rocket')).not.toBeNull();
  });

  it('builds the Lucide set at build time with the icons blocks use by default', () => {
    registerIconSet('lucide', lucide);
    for (const name of ['menu', 'zap', 'shield', 'smile', 'rocket']) {
      expect(resolveIcon(name), name).not.toBeNull();
    }
    expect(searchIcons('lucide', 'rocket')[0]).toBe('rocket');
  });
});
