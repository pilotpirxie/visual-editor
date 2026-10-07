import lucide from 'virtual:icon-set/lucide';
import { describe, expect, it } from 'vitest';
import { iconSvg, iconUse, parseIconRef, registerIconSet, resolveIcon, searchIcons } from './icons';

registerIconSet('demo', {
  width: 24,
  height: 24,
  styles: [],
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
  it('parses bare names as semantic names and set:name as a fixed pick', () => {
    expect(parseIconRef('zap')).toEqual({ set: null, name: 'zap' });
    expect(parseIconRef('demo:rocket')).toEqual({ set: 'demo', name: 'rocket' });
  });

  it('resolves icons, aliases and per-icon sizes', () => {
    expect(resolveIcon('demo:launch')?.body).toBe('<path d="M2 2"/>');
    expect(resolveIcon('demo:wide')).toEqual({
      set: 'demo',
      name: 'wide',
      body: '<path d="M4 4"/>',
      width: 32,
      height: 24,
    });
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

describe('semantic icon names', () => {
  it('follow the default icon set and fall back to Lucide', () => {
    registerIconSet('lucide', lucide);
    registerIconSet('demo', {
      width: 24,
      height: 24,
      styles: [],
      icons: { 'flash-line': { body: '<path d="M9 9"/>' } },
      aliases: {},
    });
    expect(resolveIcon('zap', 'lucide')).toMatchObject({ set: 'lucide', name: 'zap' });
    expect(resolveIcon('zap', 'unloaded-set')).toMatchObject({ set: 'lucide', name: 'zap' });
    expect(resolveIcon('lucide:zap', 'demo')).toMatchObject({ set: 'lucide' });
  });
});

describe('icon markup', () => {
  const arrow = { set: 'demo', name: 'arrow-right-line', body: '<path/>', width: 24, height: 24 };
  const rocket = { set: 'demo', name: 'rocket', body: '<path/>', width: 24, height: 24 };

  it('marks arrows and chevrons so right-to-left pages can mirror them', () => {
    expect(iconSvg(arrow)).toContain('class="icon icon-mirror"');
    expect(iconUse('icon-demo-arrow', arrow)).toContain('class="icon icon-mirror"');
  });

  it('leaves icons without a direction alone', () => {
    expect(iconSvg(rocket)).toContain('class="icon"');
  });
});
