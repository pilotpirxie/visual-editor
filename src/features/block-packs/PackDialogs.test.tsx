import { behaviors } from 'virtual:site-runtime';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { blockPacksLoaded } from '../../app/editorSlice';
import { dispatch } from '../../app/store';
import { getButton, render, runInAct } from '../../test/dom';
import { loadIntoAppStore } from '../../test/fixtures';
import {
  packOf,
  quoteCardBlockJson,
  quoteCardDefinition,
  testPackJson,
} from '../../test/packFixtures';
import examplePack from './example-pack.json';
import { ensureCustomComponents } from './customComponents';
import { LoadPackDialog } from './LoadPackDialog';
import { readBlockPack } from './validatePack';

vi.mock('../../persistence/db', () => ({
  putProject: vi.fn(async () => {}),
  listBlockPacks: vi.fn(async () => []),
  putBlockPack: vi.fn(async () => {}),
  deleteBlockPack: vi.fn(async () => {}),
}));

const BEHAVIORS = Object.keys(behaviors);

async function readingOf(pack: unknown): Promise<Awaited<ReturnType<typeof readBlockPack>>> {
  const reading = await readBlockPack(JSON.stringify(pack), { behaviorNames: BEHAVIORS });
  await ensureCustomComponents(reading.blocks);
  return reading;
}

beforeEach(() => {
  loadIntoAppStore();
  runInAct(() => dispatch(blockPacksLoaded([])));
});

describe('LoadPackDialog', () => {
  it('shows the pack, a preview at three widths and offers to add it', async () => {
    const reading = await readingOf(testPackJson());
    const { container } = render(<LoadPackDialog fileName="acme.json" reading={reading} />);
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
    const broken = { ...quoteCardBlockJson(), id: 'broken', template: '<p>\\n{{#each}}</p>' };
    const reading = await readingOf(testPackJson([quoteCardBlockJson(), broken]));
    const { container } = render(<LoadPackDialog fileName="acme.json" reading={reading} />);
    const note = container.querySelector('[role="note"]');
    expect(note?.textContent).toContain('These blocks can’t be loaded');
    expect(note?.textContent).toContain('acme/broken › template, line');
  });

  it('refuses to replace a newer pack in the library', async () => {
    runInAct(() => dispatch(blockPacksLoaded([packOf([quoteCardDefinition({}, '2.0.0')])])));
    const reading = await readingOf(testPackJson());
    const { container } = render(<LoadPackDialog fileName="acme.json" reading={reading} />);
    expect(getButton(container, 'Your library has the newer 2.0.0').disabled).toBe(true);
  });

  it('offers an update when the pack is newer', async () => {
    runInAct(() => dispatch(blockPacksLoaded([packOf([quoteCardDefinition({}, '0.9.0')])])));
    const reading = await readingOf(testPackJson());
    const { container } = render(<LoadPackDialog fileName="acme.json" reading={reading} />);
    expect(getButton(container, 'Update to 1.0.0').disabled).toBe(false);
  });
});

describe('the example pack', () => {
  it('loads without errors', async () => {
    const reading = await readingOf(examplePack);
    expect(reading.errors).toEqual([]);
    expect(reading.blocks.map(({ definition }) => definition.id)).toEqual(['example/callout']);
  });
});
