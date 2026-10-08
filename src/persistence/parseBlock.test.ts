import { describe, expect, it } from 'vitest';
import { parseBlock } from './parseBlock';

const COMPONENT_BLOCK = {
  id: 'b1',
  kind: 'component',
  componentId: 'hero-centered',
  values: { title: 'Hello' },
  overrides: { '--color-text': '#111' },
  disabled: false,
  extraClasses: ['wide'],
  hideOn: ['phone'],
  anchor: 'intro',
};

describe('parseBlock', () => {
  it('keeps a well-formed component block', () => {
    expect(parseBlock(COMPONENT_BLOCK)).toEqual(COMPONENT_BLOCK);
  });

  it('fills defaults and drops invalid optional parts', () => {
    const block = parseBlock({
      ...COMPONENT_BLOCK,
      disabled: 'yes',
      extraClasses: ['ok', '1bad', 3],
      hideOn: ['tablet', 'watch', 'phone'],
      anchor: 'has space',
      overrides: { '--color-text': 'red}', color: '#fff', '--color-background': '#fff' },
    });
    expect(block).toMatchObject({
      disabled: false,
      extraClasses: ['ok'],
      hideOn: ['phone', 'tablet'],
      overrides: { '--color-background': '#fff' },
    });
    expect(block).not.toHaveProperty('anchor');
  });

  it.each([
    ['nothing', null],
    ['a block without an id', { ...COMPONENT_BLOCK, id: '' }],
    ['an unknown kind', { ...COMPONENT_BLOCK, kind: 'widget' }],
    ['a block without values', { ...COMPONENT_BLOCK, values: [] }],
    ['a block without a component id', { ...COMPONENT_BLOCK, componentId: 7 }],
  ])('rejects %s', (_name, value) => {
    expect(parseBlock(value)).toBeNull();
  });

  it('keeps an HTML block and cleans unsafe markup out of it', () => {
    const html = {
      id: 'h1',
      kind: 'html',
      html: '<p>Hi</p>',
      disabled: false,
      extraClasses: [],
      hideOn: [],
      sourceComponentId: 'hero-centered',
    };
    expect(parseBlock(html)).toEqual(html);
    expect(parseBlock({ ...html, html: '<p onclick="x()">Hi</p>' })).toMatchObject({
      html: '<p>Hi</p>',
    });
    expect(parseBlock({ ...html, html: 7 })).toBeNull();
  });

  it('copies values so the parsed block does not share them with the input', () => {
    const block = parseBlock(COMPONENT_BLOCK);
    expect(block?.kind === 'component' && block.values).not.toBe(COMPONENT_BLOCK.values);
  });
});
