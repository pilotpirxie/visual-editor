import { describe, expect, it, vi } from 'vitest';
import { listBlockPacks } from '../../persistence/db';
import { packOf, quoteCardDefinition } from '../../test/packFixtures';
import { createTestStore } from '../../test/fixtures';
import { loadPackLibrary } from './packLibrary';

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
