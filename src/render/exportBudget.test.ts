import { gzipSync } from 'node:zlib';
import { behaviors, core } from 'virtual:site-runtime';
import { beforeAll, describe, expect, it } from 'vitest';
import { createBlankProject, createPage } from '../app/projectFactory';
import type { Block, Project } from '../app/types';
import { createBlock, registry } from '../components/registry';
import { ensureIconSets, iconSetsUsedBy } from '../features/icons/ensureIconSets';
import { buildSiteJs } from './assembleSite';
import { buildExportFiles } from './exportSite';

const KILOBYTE = 1024;
const SITE_JS_BUDGET = 10 * KILOBYTE;
const SITE_CSS_BUDGET = 30 * KILOBYTE;
const PAGE_COUNT = 10;

function tenPageSiteWithEveryBlock(): Project {
  const project = createBlankProject('Fieldnote');
  const pages = [project.pages.entities[project.pages.homePageId]];
  for (let index = 1; index < PAGE_COUNT; index += 1) {
    pages.push(createPage(`page-${index}`, `Page ${index}`, `page-${index}`));
  }
  const blocks: Record<string, Block> = {};
  const components = [...registry.values()];
  for (const [index, component] of components.entries()) {
    const block = createBlock(component.definition);
    blocks[block.id] = block;
    pages[index % PAGE_COUNT]?.blockIds.push(block.id);
  }
  const entities: Project['pages']['entities'] = {};
  for (const page of pages) {
    if (page !== undefined) entities[page.id] = page;
  }
  return {
    ...project,
    pages: { ...project.pages, ids: Object.keys(entities), entities },
    blocks: { ids: Object.keys(blocks), entities: blocks },
  };
}

const project = tenPageSiteWithEveryBlock();

beforeAll(async () => {
  await ensureIconSets(iconSetsUsedBy(Object.values(project.blocks.entities), project));
});

function gzippedSize(text: string): number {
  return gzipSync(text).length;
}

describe('export size budgets', () => {
  it('keeps site.js under 10 KB gzipped even with every behavior', () => {
    const names = Object.keys(behaviors).sort();
    const size = gzippedSize(buildSiteJs(names, { core, behaviors }));
    expect(size, `${size} bytes`).toBeLessThan(SITE_JS_BUDGET);
  });

  it('keeps site.css under 30 KB gzipped for a 10-page site that uses every block', () => {
    const { files } = buildExportFiles(project, registry, { core, behaviors });
    const css = files['assets/css/site.css'];
    if (typeof css !== 'string') throw new Error('site.css was not written as text');
    const size = gzippedSize(css);
    expect(size, `${size} bytes`).toBeLessThan(SITE_CSS_BUDGET);
  });
});
