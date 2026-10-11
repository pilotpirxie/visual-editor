import { describe, expect, it, vi } from 'vitest';
import { listBlockPacks } from '../../persistence/db';
import { blockRemoved } from '../../app/projectSlice';
import { packOf, projectUsingPacks, quoteCardDefinition } from '../../test/packFixtures';
import { createTestStore } from '../../test/fixtures';
import { loadPackLibrary, syncProjectWithLibrary } from './packLibrary';

vi.mock('../../persistence/db', () => ({
  listBlockPacks: vi.fn(async () => []),
  putProject: vi.fn(async () => {}),
}));

describe('loadPackLibrary', () => {
  it('keeps the loaded packs when the stored library has not changed', async () => {
    const store = createTestStore();
    vi.mocked(listBlockPacks).mockResolvedValue([packOf([quoteCardDefinition()])]);
    await store.dispatch(loadPackLibrary());
    const loaded = store.getState().editor.blockPacks;
    vi.mocked(listBlockPacks).mockResolvedValue([packOf([quoteCardDefinition()])]);
    await store.dispatch(loadPackLibrary());
    expect(store.getState().editor.blockPacks).toBe(loaded);
  });

  it('takes the new packs when the stored library changed', async () => {
    const store = createTestStore();
    vi.mocked(listBlockPacks).mockResolvedValue([packOf([quoteCardDefinition()])]);
    await store.dispatch(loadPackLibrary());
    vi.mocked(listBlockPacks).mockResolvedValue([]);
    await store.dispatch(loadPackLibrary());
    expect(store.getState().editor.blockPacks).toEqual([]);
  });
});

describe('syncProjectWithLibrary', () => {
  it('mentions a missing pack only while the project still uses its blocks', async () => {
    const { project, otherBlockId } = projectUsingPacks();
    const store = createTestStore(project);
    store.dispatch(blockRemoved({ blockId: otherBlockId }));
    vi.mocked(listBlockPacks).mockResolvedValue([]);
    await store.dispatch(syncProjectWithLibrary());
    const texts: string[] = [];
    for (const notice of store.getState().editor.notices) texts.push(notice.text);
    expect(texts).toHaveLength(1);
    expect(texts[0]).toContain('“Acme blocks”, which is not in your library');
  });
});
