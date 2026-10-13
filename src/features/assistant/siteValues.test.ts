import { describe, expect, it } from 'vitest';
import { validateField } from '../../components/fields';
import { forEachFieldValue } from '../../components/fieldValues';
import { builtInComponents, createBlock } from '../../components/registry';
import type { Field, ImageValue } from '../../components/types';
import { safeValues, usableValue, type Kept, type SitePages } from './siteValues';

const PAGES: SitePages = { ids: ['home', 'pricing'], homeId: 'home' };

function fieldsOf(blockId: string): Field[] {
  const component = builtInComponents.get(blockId);
  if (component === undefined) throw new Error(`The library has no block ${blockId}`);
  return component.definition.fields;
}

function expectValid(fields: readonly Field[], values: Record<string, unknown>): void {
  forEachFieldValue(fields, values, (field, value) => {
    expect(validateField(field, value), field.name).toBeNull();
  });
}

const TEXT: Field = {
  name: 'title',
  label: 'Title',
  type: 'text',
  default: 'Hello',
  maxLength: 10,
};
const REQUIRED: Field = { ...TEXT, name: 'name', required: true };
const LINK: Field = {
  name: 'link',
  label: 'Link',
  type: 'link',
  default: { type: 'url', url: '#', newTab: false },
};
const BUTTON: Field = {
  name: 'cta',
  label: 'Button',
  type: 'button',
  default: { label: 'Go', link: { type: 'url', url: '#', newTab: false }, variant: 'secondary' },
};
const ICON: Field = { name: 'icon', label: 'Icon', type: 'icon', default: 'lucide:sprout' };
const IMAGE: Field = {
  name: 'photo',
  label: 'Photo',
  type: 'image',
  default: {
    source: 'placeholder',
    src: '',
    alt: 'A team at work',
    decorative: false,
    width: 1200,
    height: 900,
    placeholder: { ratio: '4:3', subject: 'person' },
  },
};
const LIST: Field = {
  name: 'items',
  label: 'Items',
  type: 'list',
  minItems: 2,
  maxItems: 3,
  itemFields: [TEXT, ICON],
  default: [
    { title: 'One', icon: 'star' },
    { title: 'Two', icon: 'star' },
  ],
};

describe('safeValues', () => {
  it('keeps good values and cuts text to its limit', () => {
    const values = safeValues([TEXT], { title: 'A much longer title', extra: 'dropped' }, PAGES);
    expect(values).toEqual({ title: 'A much lon' });
  });

  it.each([null, 'text', 42, [], undefined])('uses the defaults for %j', (untrusted) => {
    expect(safeValues([TEXT, LINK], untrusted, PAGES)).toEqual({
      title: 'Hello',
      link: LINK.default,
    });
  });

  it('uses the default for a wrong type or an empty required field', () => {
    expect(safeValues([TEXT, REQUIRED], { title: 7, name: '  ' }, PAGES)).toEqual({
      title: 'Hello',
      name: 'Hello',
    });
  });

  it('points links at real pages and refuses unsafe addresses', () => {
    function linkFor(link: unknown): unknown {
      return safeValues([LINK], { link }, PAGES).link;
    }
    expect(linkFor({ type: 'page', pageId: 'pricing' })).toEqual({
      type: 'page',
      pageId: 'pricing',
      newTab: false,
    });
    expect(linkFor({ type: 'page', pageId: 'nowhere' })).toEqual({
      type: 'page',
      pageId: 'home',
      newTab: false,
    });
    expect(linkFor({ type: 'section', anchor: 'faq' })).toEqual({
      type: 'page',
      pageId: 'home',
      newTab: false,
    });
    expect(linkFor({ type: 'url', url: 'https://example.com', newTab: true })).toEqual({
      type: 'url',
      url: 'https://example.com',
      newTab: true,
    });
    expect(linkFor({ type: 'email', url: 'hello@example.com' })).toEqual({
      type: 'email',
      url: 'hello@example.com',
      newTab: false,
    });
    expect(linkFor({ type: 'url', url: 'javascript:alert(1)' })).toEqual(LINK.default);
    expect(linkFor({ type: 'email', url: 'not an address' })).toEqual(LINK.default);
    expect(linkFor({ type: 'ftp', url: 'ftp://example.com' })).toEqual(LINK.default);
    expect(linkFor('https://example.com')).toEqual(LINK.default);
  });

  it('builds buttons from a label and a link', () => {
    const good = { label: 'See prices', link: { type: 'page', pageId: 'pricing' } };
    expect(safeValues([BUTTON], { cta: good }, PAGES).cta).toEqual({
      label: 'See prices',
      link: { type: 'page', pageId: 'pricing', newTab: false },
      variant: 'secondary',
    });
    const styled = { ...good, variant: 'ghost' };
    expect(safeValues([BUTTON], { cta: styled }, PAGES).cta).toHaveProperty('variant', 'ghost');
    for (const bad of [{ label: '', link: good.link }, { label: 'Go' }, { ...good, label: 5 }]) {
      expect(safeValues([BUTTON], { cta: bad }, PAGES).cta).toEqual(BUTTON.default);
    }
  });

  it('turns an image description into a placeholder', () => {
    const photo = safeValues([IMAGE], { photo: { alt: 'A baker', ratio: '16:9' } }, PAGES).photo;
    expect(photo).toEqual({
      source: 'placeholder',
      src: '',
      alt: 'A baker',
      decorative: false,
      width: 1200,
      height: 675,
      placeholder: { ratio: '16:9', subject: 'person' },
    });
    const remote = { src: 'https://example.com/a.jpg', ratio: '9:99', subject: 'cat' };
    expect(safeValues([IMAGE], { photo: remote }, PAGES).photo).toEqual(IMAGE.default);
    expect(safeValues([IMAGE], { photo: 'a.jpg' }, PAGES).photo).toEqual(IMAGE.default);
  });

  it('accepts only known icon names', () => {
    function iconFor(icon: unknown): unknown {
      return safeValues([ICON], { icon }, PAGES).icon;
    }
    expect(iconFor('rocket')).toBe('rocket');
    expect(iconFor('')).toBe('');
    expect(iconFor('lucide:sprout')).toBe('lucide:sprout');
    expect(iconFor('lucide:rocket')).toBe('lucide:sprout');
    expect(iconFor('made-up-icon')).toBe('lucide:sprout');
    expect(iconFor('<svg>')).toBe('lucide:sprout');
  });

  it('keeps lists within their limits and repairs each item', () => {
    const many = [
      { title: 'A' },
      { title: 'B', icon: 'nope' },
      'junk',
      { title: 'C' },
      { title: 'D' },
    ];
    expect(safeValues([LIST], { items: many }, PAGES).items).toEqual([
      { title: 'A', icon: 'lucide:sprout' },
      { title: 'B', icon: 'lucide:sprout' },
      { title: 'C', icon: 'lucide:sprout' },
    ]);
    expect(safeValues([LIST], { items: [{ title: 'Only' }] }, PAGES).items).toEqual(LIST.default);
    expect(safeValues([LIST], { items: 'three' }, PAGES).items).toEqual(LIST.default);
  });

  it('cleans rich text', () => {
    const rich: Field = { name: 'body', label: 'Body', type: 'richtext', default: '<p>Hi</p>' };
    const dirty = '<p onclick="x()">Hello <script>alert(1)</script><strong>there</strong></p>';
    const body = safeValues([rich], { body: dirty }, PAGES).body;
    expect(body).toBe('<p>Hello <strong>there</strong></p>');
  });

  it('never lets the model set where a form is sent', () => {
    const fields = fieldsOf('contact-form');
    const values = safeValues(
      fields,
      { formAction: 'https://evil.example', formMethod: 'get' },
      PAGES,
    );
    for (const field of fields) {
      if (field.name === 'formAction' || field.name === 'formMethod') {
        expect(values[field.name]).toEqual(field.default);
      }
    }
    expect(Object.keys(values)).toContain('formAction');
  });

  it('gives every library block valid values whatever it is handed', () => {
    const hostile = [undefined, {}, { title: 5, items: [null, 3], image: 'x', cta: { label: {} } }];
    for (const { definition } of builtInComponents.values()) {
      for (const untrusted of hostile) {
        expectValid(definition.fields, safeValues(definition.fields, untrusted, PAGES));
      }
    }
  });

  it('returns the defaults of every library block when it is given nothing', () => {
    for (const { definition } of builtInComponents.values()) {
      const defaults = createBlock(definition).values;
      expect(safeValues(definition.fields, {}, PAGES), definition.id).toEqual(defaults);
    }
  });
});

describe('usableValue', () => {
  const upload: ImageValue = {
    source: 'upload',
    src: 'data:image/png;base64,iVBORw0KGgo=',
    name: 'team.png',
    alt: 'The team',
    decorative: true,
    width: 640,
    height: 480,
  };
  const kept: Kept = {
    pictures: new Map([['p1', upload]]),
    icons: new Set(['remix:star-line']),
    anchors: new Set(['pricing']),
  };

  it('returns nothing for a value that cannot be used, so the caller keeps what it had', () => {
    expect(usableValue(REQUIRED, '', PAGES)).toBeUndefined();
    expect(usableValue(LIST, [{ title: 'Only one' }], PAGES)).toBeUndefined();
    expect(usableValue(LIST, 'not a list', PAGES)).toBeUndefined();
    expect(
      usableValue({ ...TEXT, name: 'formAction' }, 'https://example.com', PAGES),
    ).toBeUndefined();
    expect(usableValue(TEXT, 'Fine', PAGES)).toBe('Fine');
  });

  it('keeps an uploaded picture by its id and can give it new alt text', () => {
    expect(usableValue(IMAGE, { picture: 'p1', alt: ' ' }, PAGES, kept)).toBe(upload);
    expect(usableValue(IMAGE, { picture: 'p1', alt: 'Six bakers' }, PAGES, kept)).toEqual({
      ...upload,
      alt: 'Six bakers',
      decorative: false,
    });
    expect(usableValue(IMAGE, { picture: 'p9', alt: 'Six bakers' }, PAGES, kept)).toMatchObject({
      source: 'placeholder',
      alt: 'Six bakers',
    });
    expect(usableValue(IMAGE, { picture: 'p1' }, PAGES)).toMatchObject({ source: 'placeholder' });
  });

  it('keeps hand-picked icons that the section already had', () => {
    expect(usableValue(ICON, 'remix:star-line', PAGES, kept)).toBe('remix:star-line');
    expect(usableValue(ICON, 'remix:moon-line', PAGES, kept)).toBeUndefined();
    expect(usableValue(ICON, 'remix:star-line', PAGES)).toBeUndefined();
  });

  it('keeps links to sections the block already pointed at', () => {
    const samePage = { type: 'section', anchor: 'pricing' };
    expect(usableValue(LINK, samePage, PAGES, kept)).toEqual({
      type: 'section',
      anchor: 'pricing',
      newTab: false,
    });
    expect(usableValue(LINK, { ...samePage, pageId: 'pricing' }, PAGES, kept)).toEqual({
      type: 'section',
      pageId: 'pricing',
      anchor: 'pricing',
      newTab: false,
    });
    expect(usableValue(LINK, { type: 'section', anchor: 'invented' }, PAGES, kept)).toEqual({
      type: 'page',
      pageId: 'home',
      newTab: false,
    });
    expect(usableValue(LINK, samePage, PAGES)).toEqual({
      type: 'page',
      pageId: 'home',
      newTab: false,
    });
  });

  it('keeps what a list item had when the list comes back whole', () => {
    const items = [
      { title: 'One', icon: 'remix:star-line' },
      { title: 'Two', icon: 'remix:moon-line' },
    ];
    expect(usableValue(LIST, items, PAGES, kept)).toEqual([
      { title: 'One', icon: 'remix:star-line' },
      { title: 'Two', icon: 'lucide:sprout' },
    ]);
  });
});
