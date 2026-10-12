import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { blockPacksLoaded, readOnlyChanged } from '../../app/editorSlice';
import { dispatch, store } from '../../app/store';
import { ensurePackBlocks } from '../../components/registry';
import { parsePackFiles } from '../../components/packFormat';
import { readBlockPack } from '../../components/validatePack';
import { deleteBlockPack } from '../../persistence/db';
import { click, getButton, queryButton, render, runInAct } from '../../test/dom';
import { loadIntoAppStore } from '../../test/fixtures';
import {
  packOf,
  projectUsingPacks,
  quoteCardBlock,
  quoteCardDefinition,
  testPackZip,
  type FixtureBlock,
} from '../../test/packFixtures';
import { LoadPackDialog } from './LoadPackDialog';
import { ManagePacksDialog } from './ManagePacksDialog';

vi.mock('../../persistence/db', () => ({
  putProject: vi.fn(async () => {}),
  listBlockPacks: vi.fn(async () => []),
  putBlockPack: vi.fn(async () => {}),
  deleteBlockPack: vi.fn(async () => {}),
  latestSnapshotText: vi.fn(async () => null),
  putSnapshot: vi.fn(async () => {}),
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
  vi.mocked(deleteBlockPack).mockClear();
});

function packRow(container: HTMLElement, packName: string): HTMLElement {
  for (const row of container.querySelectorAll<HTMLElement>('.ve-pack-row')) {
    if (row.textContent.includes(packName)) return row;
  }
  throw new Error(`No row for the pack ${packName}`);
}

function embeddedPackIds(): string[] {
  const ids = new Set<string>();
  for (const { pack } of Object.values(store.getState().project.packBlocks)) ids.add(pack.id);
  return [...ids];
}

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

describe('ManagePacksDialog', () => {
  it('says what removing a pack deletes from the open project', () => {
    loadIntoAppStore(projectUsingPacks().project);
    runInAct(() => dispatch(blockPacksLoaded([packOf([quoteCardDefinition()])])));
    const { container } = render(<ManagePacksDialog />);
    const row = packRow(container, 'Acme blocks');
    click(getButton(row, 'Remove'));
    expect(row.querySelector('.ve-pack-removal')?.textContent).toBe(
      'Deletes 3 blocks from this project: Home (2), Shared footer (1). Undo brings the blocks back. Other projects keep their saved copy.',
    );
    click(getButton(row, 'Keep'));
    expect(row.querySelector('.ve-pack-removal')).toBeNull();
  });

  it('removes the pack from the library and its blocks from the project', async () => {
    const { project, packBlockIds } = projectUsingPacks();
    loadIntoAppStore(project);
    runInAct(() => dispatch(blockPacksLoaded([packOf([quoteCardDefinition()])])));
    const { container } = render(<ManagePacksDialog />);
    const row = packRow(container, 'Acme blocks');
    click(getButton(row, 'Remove'));
    click(getButton(row, 'Remove pack and its blocks'));
    await vi.waitFor(() => expect(embeddedPackIds()).toEqual(['acme-extra']));
    expect(deleteBlockPack).toHaveBeenCalledWith('acme');
    expect(store.getState().editor.blockPacks).toEqual([]);
    for (const blockId of packBlockIds) {
      expect(store.getState().project.blocks.entities[blockId]).toBeUndefined();
    }
    expect(store.getState().history.past).toHaveLength(1);
  });

  it('leaves the project alone when the library cannot be changed', async () => {
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(deleteBlockPack).mockRejectedValueOnce(new Error('The disk is full'));
    loadIntoAppStore(projectUsingPacks().project);
    runInAct(() => dispatch(blockPacksLoaded([packOf([quoteCardDefinition()])])));
    const { container } = render(<ManagePacksDialog />);
    const row = packRow(container, 'Acme blocks');
    click(getButton(row, 'Remove'));
    click(getButton(row, 'Remove pack and its blocks'));
    await vi.waitFor(() => expect(logged).toHaveBeenCalled());
    logged.mockRestore();
    expect(embeddedPackIds()).toEqual(['acme', 'acme-extra']);
    expect(store.getState().history.past).toHaveLength(0);
    expect(store.getState().editor.notices.at(-1)?.text).toBe(
      'Removing the block pack failed: The disk is full',
    );
  });

  it('removes a pack that is not in the library from the project only', () => {
    loadIntoAppStore(projectUsingPacks().project);
    const { container } = render(<ManagePacksDialog />);
    const row = packRow(container, 'Acme blocks');
    click(getButton(row, 'Remove'));
    expect(row.querySelector('.ve-pack-removal')?.textContent).toBe(
      'Deletes 3 blocks from this project: Home (2), Shared footer (1). Undo brings the blocks back.',
    );
    click(getButton(row, 'Remove from project'));
    expect(embeddedPackIds()).toEqual(['acme-extra']);
    expect(deleteBlockPack).not.toHaveBeenCalled();
    expect(getButton(packRow(container, 'Acme extras'), 'Add to library').disabled).toBe(false);
  });

  it('offers no removal in a read-only tab', () => {
    loadIntoAppStore(projectUsingPacks().project);
    runInAct(() => {
      dispatch(blockPacksLoaded([packOf([quoteCardDefinition()])]));
      dispatch(readOnlyChanged(true));
    });
    const { container } = render(<ManagePacksDialog />);
    expect(getButton(packRow(container, 'Acme blocks'), 'Remove').disabled).toBe(true);
    expect(getButton(packRow(container, 'Acme extras'), 'Remove').disabled).toBe(true);
    runInAct(() => dispatch(readOnlyChanged(false)));
  });

  it('describes a library pack and a pack that only the project has', () => {
    loadIntoAppStore(projectUsingPacks().project);
    runInAct(() => dispatch(blockPacksLoaded([packOf([quoteCardDefinition()])])));
    const { container } = render(<ManagePacksDialog />);
    const inLibrary = packRow(container, 'Acme blocks');
    expect(inLibrary.querySelector('strong')?.textContent).toBe('Acme blocks 1.0.0');
    expect(inLibrary.querySelector('.ui-muted')?.textContent).toBe('Acme Studio · MIT · 1 block');
    expect(queryButton(inLibrary, 'Update')).not.toBeNull();
    expect(queryButton(inLibrary, 'Download')).not.toBeNull();
    expect(queryButton(inLibrary, 'Add to library')).toBeNull();
    const missing = packRow(container, 'Acme extras');
    expect(missing.querySelector('.ui-muted')?.textContent).toBe('Acme Studio · MIT');
    expect(queryButton(missing, 'Update')).toBeNull();
    expect(queryButton(missing, 'Download')).toBeNull();
    expect(missing.querySelector('.ve-pack-badge')).toBeNull();
  });

  it('marks a partial pack and offers no download for it', () => {
    const partial = { ...packOf([quoteCardDefinition()]), isPartial: true };
    runInAct(() => dispatch(blockPacksLoaded([partial])));
    const { container } = render(<ManagePacksDialog />);
    const row = packRow(container, 'Acme blocks');
    expect(row.querySelector('.ve-pack-badge')?.textContent).toBe('Partial');
    expect(queryButton(row, 'Download')).toBeNull();
    expect(queryButton(row, 'Update')).not.toBeNull();
  });

  it('swaps the idle actions for the confirmation and back', () => {
    runInAct(() => dispatch(blockPacksLoaded([packOf([quoteCardDefinition()])])));
    const { container } = render(<ManagePacksDialog />);
    const row = packRow(container, 'Acme blocks');
    click(getButton(row, 'Remove'));
    expect(queryButton(row, 'Update')).toBeNull();
    expect(row.querySelector('.ve-pack-removal')?.textContent).toBe(
      'Not used on any page of this project. Other projects keep their saved copy.',
    );
    click(getButton(row, 'Keep'));
    expect(queryButton(row, 'Update')).not.toBeNull();
    expect(queryButton(row, 'Remove pack and its blocks')).toBeNull();
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
