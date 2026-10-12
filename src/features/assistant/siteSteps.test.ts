import { describe, expect, it } from 'vitest';
import { builtInComponents } from '../../components/registry';
import { AssistantError } from './openRouter';
import {
  briefWithAnswers,
  clarifyRequest,
  DEFAULT_FOOTER_ID,
  DEFAULT_HEADER_ID,
  designRequest,
  MAX_CUSTOM_SECTIONS,
  MAX_PAGES,
  MAX_QUESTIONS,
  MAX_SECTIONS,
  pageParts,
  pageRequest,
  parseClarification,
  parseSections,
  parseSitePlan,
  planRequest,
  sharedRequest,
  siteSizeOf,
  type PagePlan,
  type SectionPlan,
  type SitePlan,
} from './siteSteps';

const PLAN_ANSWER = {
  title: 'Crumb & Co',
  description: 'A neighbourhood bakery in Leeds.',
  language: 'en-GB',
  header: 'nav-centered',
  footer: 'footer-columns',
  pages: [
    {
      name: 'Home',
      slug: 'welcome',
      purpose: 'Introduce the bakery',
      sections: [
        { block: 'hero-centered', custom: '', theme: 'default', note: 'Fresh bread daily' },
        { block: 'features-grid-3', custom: '', theme: 'surface', note: 'Why us' },
        { block: '', custom: 'A table of opening hours', theme: 'default', note: '' },
        { block: 'cta-centered', custom: '', theme: 'dark', note: 'Order a cake' },
      ],
    },
    {
      name: 'Our Menu',
      slug: 'Menu & Prices',
      purpose: 'List what we bake',
      sections: [{ block: 'pricing-3-plans', custom: '', theme: 'neon', note: 'Prices' }],
    },
  ],
};

function plan(): SitePlan {
  return parseSitePlan(PLAN_ANSWER);
}

function strictObjects(schema: unknown, path: string): string[] {
  if (typeof schema !== 'object' || schema === null) return [];
  const problems: string[] = [];
  const node: Record<string, unknown> = { ...schema };
  if (node.type === 'object') {
    const properties = Object.keys(
      typeof node.properties === 'object' ? { ...node.properties } : {},
    );
    if (node.additionalProperties !== false) problems.push(`${path} allows extra properties`);
    if (JSON.stringify(node.required) !== JSON.stringify(properties)) {
      problems.push(`${path} does not require every property`);
    }
  }
  for (const [key, value] of Object.entries(node)) {
    problems.push(...strictObjects(value, `${path}.${key}`));
  }
  return problems;
}

describe('clarifyRequest', () => {
  it('sends the description and asks everything in one go', () => {
    const request = clarifyRequest('A bakery site');
    expect(request.user).toContain('"""A bakery site"""');
    expect(request.user).toContain(`up to ${MAX_QUESTIONS} short questions`);
    expect(request.user).toContain('You can ask only this once');
    expect(request.user).toContain('Leave out of the brief whatever you ask about');
  });
});

describe('briefWithAnswers', () => {
  it('adds the given answers below the brief and says they win', () => {
    const brief = briefWithAnswers('A bakery site.', [
      { question: 'Where?', answer: 'Leeds' },
      { question: 'What is it called?', answer: '' },
      { question: 'Which pages?', answer: 'Menu, Our story' },
    ]);
    expect(brief).toBe(
      [
        'A bakery site.',
        '',
        'The person then answered these questions. Their answers win over anything above:',
        '- Where?',
        '  Leeds',
        '- Which pages?',
        '  Menu, Our story',
      ].join('\n'),
    );
  });

  it('leaves the brief alone when nothing was answered', () => {
    expect(briefWithAnswers('A bakery site.', [])).toBe('A bakery site.');
    expect(briefWithAnswers('A bakery site.', [{ question: 'Where?', answer: '' }])).toBe(
      'A bakery site.',
    );
  });
});

describe('parseClarification', () => {
  it('keeps real questions with their suggestions', () => {
    const clarification = parseClarification({
      isClear: true,
      brief: '  A bakery in Leeds.  ',
      questions: [
        { question: 'Do you take orders online?', suggestions: ['Yes', 'No', 7, '', 'By phone'] },
        { question: '   ' },
        'What?',
      ],
    });
    expect(clarification).toEqual({
      isClear: false,
      brief: 'A bakery in Leeds.',
      questions: [
        {
          question: 'Do you take orders online?',
          suggestions: ['Yes', 'No', 'By phone'],
          allowsMany: false,
          recommended: [],
        },
      ],
    });
  });

  it('lets several answers be picked only when there are several to pick from', () => {
    const { questions } = parseClarification({
      questions: [
        { question: 'Which pages?', suggestions: ['Menu', 'Story'], allowsMany: true },
        { question: 'Which city?', suggestions: ['Leeds'], allowsMany: true },
        { question: 'What tone?', suggestions: ['Warm', 'Formal'], allowsMany: 'yes' },
      ],
    });
    expect(questions.map(({ allowsMany }) => allowsMany)).toEqual([true, false, false]);
  });

  it('keeps up to eight suggestions when several fit and four otherwise', () => {
    const sections = [
      'Hero',
      'Services',
      'Prices',
      'Gallery',
      'About',
      'Reviews',
      'FAQ',
      'Contact',
    ];
    const { questions } = parseClarification({
      questions: [
        { question: 'Which sections?', suggestions: [...sections, 'Blog'], allowsMany: true },
        { question: 'Which style?', suggestions: sections, allowsMany: false },
      ],
    });
    expect(questions[0].suggestions).toEqual(sections);
    expect(questions[1].suggestions).toEqual(['Hero', 'Services', 'Prices', 'Gallery']);
  });

  it('keeps only recommended answers that were suggested, one unless several fit', () => {
    const { questions } = parseClarification({
      questions: [
        {
          question: 'Which pages?',
          suggestions: ['Menu', 'Story', 'Gallery'],
          allowsMany: true,
          recommended: ['Story', ' Menu ', 'Story', 'Shop', 4],
        },
        {
          question: 'What tone?',
          suggestions: ['Warm', 'Formal'],
          allowsMany: false,
          recommended: ['Bold', 'Formal', 'Warm'],
        },
        { question: 'Which city?', suggestions: ['Leeds'], recommended: 'Leeds' },
      ],
    });
    expect(questions.map(({ recommended }) => recommended)).toEqual([
      ['Story', 'Menu'],
      ['Formal'],
      [],
    ]);
  });

  it('asks at most four questions', () => {
    const questions = [1, 2, 3, 4, 5, 6].map((number) => ({ question: `Question ${number}?` }));
    expect(parseClarification({ questions }).questions).toHaveLength(MAX_QUESTIONS);
  });

  it.each([null, 'ready', [], 3])('treats %j as clear with no brief', (value) => {
    expect(parseClarification(value)).toEqual({ isClear: true, questions: [], brief: '' });
  });
});

describe('request schemas', () => {
  it('are strict enough for structured output', () => {
    const requests = [clarifyRequest('A site'), designRequest('Brief'), planRequest('Brief')];
    for (const request of requests) {
      expect(request.schema).not.toBeNull();
      expect(strictObjects(request.schema?.schema, request.schema?.name ?? '')).toEqual([]);
    }
  });

  it('offer the fonts and icon sets by name', () => {
    const request = designRequest('A calm bakery brand');
    expect(request.user).toContain('"""A calm bakery brand"""');
    expect(request.user).toContain('Fraunces');
    expect(request.user).toContain('phosphor');
  });

  it('send the block library with the plan request', () => {
    const request = planRequest('A bakery');
    expect(request.user).toContain('hero-centered: ');
    expect(request.user).toContain('## Footers (category "footers")');
  });

  it.each([
    ['onePage', 'Site size: "One page". Plan 1 page.', 'The home page has 9 to 12 sections'],
    ['standard', 'Site size: "Home plus a few pages". Plan 3 to 4 pages.', '10 to 14 sections'],
    ['large', 'Site size: "Large site". Plan 5 to 8 pages.', 'The home page has 12 to 16 sections'],
  ] as const)('tell the planner how big a %s site is', (size, pages, home) => {
    const request = planRequest('A bakery', size);
    expect(request.user).toContain(pages);
    expect(request.user).toContain(home);
    expect(request.user.includes('Every other page has')).toBe(size !== 'onePage');
  });

  it('plan a standard size unless told otherwise', () => {
    expect(planRequest('A bakery').user).toContain('Site size: "Home plus a few pages"');
  });

  it('give the planner and the questions the typical sections of common kinds of site', () => {
    const playbook = 'Beauty and grooming (hairdresser, barber';
    expect(planRequest('A salon').user).toContain(playbook);
    expect(clarifyRequest('A salon').user).toContain(playbook);
    expect(planRequest('A salon').user).toContain('one long text section for search engines');
  });

  it('read a picked size from its label and fall back to the standard one', () => {
    expect(siteSizeOf('One page')).toBe('onePage');
    expect(siteSizeOf('Large site')).toBe('large');
    expect(siteSizeOf('Home plus a few pages')).toBe('standard');
    expect(siteSizeOf('')).toBe('standard');
  });
});

describe('parseSitePlan', () => {
  it('reads a good plan', () => {
    expect(plan()).toEqual({
      title: 'Crumb & Co',
      description: 'A neighbourhood bakery in Leeds.',
      language: 'en-GB',
      headerBlockId: 'nav-centered',
      footerBlockId: 'footer-columns',
      pages: [
        {
          name: 'Home',
          slug: 'home',
          purpose: 'Introduce the bakery',
          sections: [
            {
              kind: 'block',
              blockId: 'hero-centered',
              theme: 'default',
              note: 'Fresh bread daily',
            },
            { kind: 'block', blockId: 'features-grid-3', theme: 'surface', note: 'Why us' },
            { kind: 'custom', description: 'A table of opening hours' },
            { kind: 'block', blockId: 'cta-centered', theme: 'dark', note: 'Order a cake' },
          ],
        },
        {
          name: 'Our Menu',
          slug: 'menu-prices',
          purpose: 'List what we bake',
          sections: [
            { kind: 'block', blockId: 'pricing-3-plans', theme: 'default', note: 'Prices' },
          ],
        },
      ],
    });
  });

  it('drops blocks that do not exist, repeat or belong in the header or footer', () => {
    const sections = [
      { block: 'hero-centered', custom: '' },
      { block: 'hero-centered', custom: '' },
      { block: 'no-such-block', custom: '' },
      { block: 'nav-simple', custom: '' },
      { block: 'footer-simple', custom: '' },
      { block: 'modal-simple', custom: '' },
      { block: 'no-such-block', custom: 'ignored because a block was named' },
      'junk',
    ];
    const parsed = parseSitePlan({ pages: [{ name: 'Home', sections }] });
    expect(parsed.pages[0].sections).toEqual([
      { kind: 'block', blockId: 'hero-centered', theme: 'default', note: '' },
    ]);
  });

  it('falls back to a plain header, footer, language and names', () => {
    const parsed = parseSitePlan({
      language: 'English',
      header: 'footer-simple',
      footer: 'nope',
      pages: [
        { sections: [{ block: 'hero-centered' }] },
        { sections: [{ block: 'faq-accordion' }] },
      ],
    });
    expect(parsed.headerBlockId).toBe(DEFAULT_HEADER_ID);
    expect(parsed.footerBlockId).toBe(DEFAULT_FOOTER_ID);
    expect(parsed.language).toBe('en');
    expect(parsed.title).toBe('');
    expect(parsed.pages.map(({ name, slug }) => [name, slug])).toEqual([
      ['Home', 'home'],
      ['Page', 'page'],
    ]);
  });

  it('keeps slugs unique and within the page, section and custom limits', () => {
    const sections = [];
    for (let index = 0; index < MAX_CUSTOM_SECTIONS + 2; index += 1) {
      sections.push({ block: '', custom: `Custom ${index}` });
    }
    const pages = [];
    for (let index = 0; index < MAX_PAGES + 3; index += 1) {
      pages.push({ name: 'About', slug: 'home', sections });
    }
    const parsed = parseSitePlan({ pages });
    expect(parsed.pages).toHaveLength(MAX_PAGES);
    expect(parsed.pages.map(({ slug }) => slug)).toEqual([
      'home',
      'home-2',
      'home-3',
      'home-4',
      'home-5',
      'home-6',
      'home-7',
      'home-8',
    ]);
    expect(parsed.pages[0].sections).toHaveLength(MAX_CUSTOM_SECTIONS);
  });

  it('stops at the section limit and keeps heroes at the top', () => {
    const sections = [{ block: 'hero-centered' }, { block: 'hero-app' }];
    for (const { definition } of builtInComponents.values()) {
      if (definition.category === 'features') sections.push({ block: definition.id });
    }
    const planned = parseSitePlan({ pages: [{ sections }] }).pages[0].sections;
    expect(planned).toHaveLength(MAX_SECTIONS);
    expect(planned[0]).toHaveProperty('blockId', 'hero-centered');
    expect(planned[1]).not.toHaveProperty('blockId', 'hero-app');
  });

  it.each([null, {}, { pages: [] }, { pages: [{ name: 'Empty', sections: [] }] }])(
    'refuses %j because it has no usable page',
    (value) => {
      expect(() => parseSitePlan(value)).toThrow(AssistantError);
    },
  );
});

function longPage(sectionCount: number): PagePlan {
  const sections: SectionPlan[] = [];
  for (const { definition } of builtInComponents.values()) {
    if (sections.length === sectionCount) break;
    if (definition.category !== 'features') continue;
    const note = `Note ${sections.length + 1}`;
    sections.push({ kind: 'block', blockId: definition.id, theme: 'default', note });
  }
  return { name: 'Home', slug: 'home', purpose: 'Welcome', sections };
}

describe('pageParts', () => {
  it.each([
    { sectionCount: 1, sizes: [1] },
    { sectionCount: 5, sizes: [5] },
    { sectionCount: 6, sizes: [3, 3] },
    { sectionCount: 11, sizes: [4, 4, 3] },
    { sectionCount: 14, sizes: [5, 5, 4] },
    { sectionCount: 16, sizes: [4, 4, 4, 4] },
  ])('splits $sectionCount sections into parts of $sizes', ({ sectionCount, sizes }) => {
    const parts = pageParts(longPage(sectionCount));
    expect(parts.map(({ count }) => count)).toEqual(sizes);
    let next = 0;
    for (const part of parts) {
      expect(part.first).toBe(next);
      next += part.count;
    }
  });
});

describe('writing requests', () => {
  it('describe each section of the page in order', () => {
    const [whole] = pageParts(plan().pages[0]);
    const request = pageRequest('Brief text', plan(), whole);
    expect(request.schema).toBeNull();
    expect(request.user).toContain('exactly 4 entries');
    expect(request.user).toContain('"block":"hero-centered"');
    expect(request.user).toContain('"note":"Fresh bread daily"');
    expect(request.user).toContain('{"custom":"A table of opening hours"}');
    expect(request.user).toContain('For a custom section return');
    expect(request.user).toContain('"home" (Home), "menu-prices" (Our Menu)');
    expect(request.user).toContain('rocket');
    expect(request.user).not.toContain('Write only sections');
  });

  it('leave the custom rules out when a page has no custom section', () => {
    const [whole] = pageParts(plan().pages[1]);
    const request = pageRequest('Brief text', plan(), whole);
    expect(request.user).not.toContain('For a custom section return');
  });

  it('give one part of a long page its own sections and the outline of the whole page', () => {
    const page = longPage(11);
    const site: SitePlan = { ...plan(), pages: [page] };
    const second = pageParts(page)[1];
    const request = pageRequest('Brief text', site, second);
    expect(request.user).toContain('Write the content of the page "Home" (Welcome).');
    expect(request.user).toContain('Write only sections 5 to 8 of this page.');
    expect(request.user).toContain('exactly 4 entries');
    for (let number = 1; number <= 11; number += 1) {
      expect(request.user).toContain(`: Note ${number}`);
    }
    const tasks = request.user.slice(request.user.indexOf('Sections to write:'));
    expect(tasks).toContain('"note":"Note 5"');
    expect(tasks).toContain('"note":"Note 8"');
    expect(tasks).not.toContain('"note":"Note 4"');
    expect(tasks).not.toContain('"note":"Note 9"');
  });

  it('ask for the navigation and footer together', () => {
    const request = sharedRequest('Brief text', plan());
    expect(request.user).toContain('"block":"nav-centered"');
    expect(request.user).toContain('"block":"footer-columns"');
  });
});

describe('parseSections', () => {
  it('lines the answers up with the planned sections', () => {
    const answer = { sections: [{ values: { title: 'Hi' } }, { html: '<section></section>' }, 5] };
    expect(parseSections(answer, 4)).toEqual([
      { kind: 'values', values: { title: 'Hi' } },
      { kind: 'html', html: '<section></section>' },
      { kind: 'values', values: undefined },
      { kind: 'values', values: undefined },
    ]);
  });

  it('survives an answer without sections', () => {
    expect(parseSections('nothing', 1)).toEqual([{ kind: 'values', values: undefined }]);
  });
});
