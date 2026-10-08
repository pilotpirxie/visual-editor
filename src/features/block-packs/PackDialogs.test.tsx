import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { blockPacksLoaded } from '../../app/editorSlice';
import { dispatch } from '../../app/store';
import { ensurePackBlocks } from '../../components/registry';
import { parsePackFiles } from '../../components/packFormat';
import { readBlockPack } from '../../components/validatePack';
import { getButton, render, runInAct } from '../../test/dom';
import { loadIntoAppStore } from '../../test/fixtures';
import {
  packOf,
  quoteCardBlock,
  quoteCardDefinition,
  testPackZip,
  type FixtureBlock,
} from '../../test/packFixtures';
import { LoadPackDialog } from './LoadPackDialog';

vi.mock('../../persistence/db', () => ({
  putProject: vi.fn(async () => {}),
  listBlockPacks: vi.fn(async () => []),
  putBlockPack: vi.fn(async () => {}),
  deleteBlockPack: vi.fn(async () => {}),
}));

const EXAMPLE_PACK = join(import.meta.dirname, 'example-pack');

async function readingOf(
  blocks: FixtureBlock[] = [quoteCardBlock()],
): Promise<Awaited<ReturnType<typeof readBlockPack>>> {
  const reading = await readBlockPack(await testPackZip(blocks), new Map());
  await ensurePackBlocks(reading.blocks);
  return reading;
}

function examplePackFiles(): Map<string, Uint8Array> {
  const files = new Map<string, Uint8Array>();
  for (const entry of readdirSync(EXAMPLE_PACK, { recursive: true, withFileTypes: true })) {
    if (!entry.isFile()) continue;
    const path = join(entry.parentPath, entry.name);
    files.set(relative(EXAMPLE_PACK, path), readFileSync(path));
  }
  return files;
}

beforeEach(() => {
  loadIntoAppStore();
  runInAct(() => dispatch(blockPacksLoaded([])));
});

describe('LoadPackDialog', () => {
  it('shows the pack, a preview at three widths and offers to add it', async () => {
    const reading = await readingOf();
    const { container } = render(<LoadPackDialog fileName="acme.zip" reading={reading} />);
    expect(container.querySelector('h2')?.textContent).toBe('Acme blocks 1.0.0');
    expect(container.textContent).toContain('By Acme Studio · MIT license · 1 of 1 blocks ready');
    const captions = [...container.querySelectorAll('figcaption')].map(
      ({ textContent }) => textContent,
    );
    expect(captions).toEqual(['Phone · 375 px', 'Tablet · 768 px', 'Desktop · 1440 px']);
    expect(container.querySelector('iframe')?.getAttribute('srcdoc')).toContain(
      'b-acme-quote-card',
    );
    expect(getButton(container, 'Add to library').disabled).toBe(false);
  });

  it('lists every error with its block, field and line', async () => {
    const broken = { ...quoteCardBlock({}, 'broken'), template: '<p>\n{{#each}}</p>' };
    const reading = await readingOf([quoteCardBlock(), broken]);
    const { container } = render(<LoadPackDialog fileName="acme.zip" reading={reading} />);
    const note = container.querySelector('[role="note"]');
    expect(note?.textContent).toContain('These blocks can’t be loaded');
    expect(note?.textContent).toContain('acme/broken › template.hbs, line');
  });

  it('refuses to replace a newer pack in the library', async () => {
    runInAct(() => dispatch(blockPacksLoaded([packOf([quoteCardDefinition({}, '2.0.0')])])));
    const reading = await readingOf();
    const { container } = render(<LoadPackDialog fileName="acme.zip" reading={reading} />);
    expect(getButton(container, 'Your library has the newer 2.0.0').disabled).toBe(true);
  });

  it('offers an update when the pack is newer', async () => {
    runInAct(() => dispatch(blockPacksLoaded([packOf([quoteCardDefinition({}, '0.9.0')])])));
    const reading = await readingOf();
    const { container } = render(<LoadPackDialog fileName="acme.zip" reading={reading} />);
    expect(getButton(container, 'Update to 1.0.0').disabled).toBe(false);
  });
});

describe('the example pack', () => {
  it('reads without errors', () => {
    const reading = parsePackFiles(examplePackFiles());
    expect(reading.errors).toEqual([]);
    expect(reading.blocks.map(({ definition }) => definition.id)).toEqual(['example/callout']);
  });

  it('passes every block check', async () => {
    const [packBlock] = parsePackFiles(examplePackFiles()).blocks;
    if (packBlock === undefined) throw new Error('The example pack has no blocks');
    expect((await ensurePackBlocks([packBlock])).problems).toEqual([]);
  });
});
