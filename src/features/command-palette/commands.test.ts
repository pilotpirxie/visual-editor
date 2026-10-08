import { describe, expect, it } from 'vitest';
import { createPage } from '../../app/projectFactory';
import { builtInComponents } from '../../components/registry';
import type { SavedBlockRecord } from '../../persistence/db';
import { createTestStore } from '../../test/fixtures';
import {
  buildPaletteCommands,
  filterPaletteCommands,
  MAX_PALETTE_RESULTS,
  runPaletteAction,
} from './commands';

const entries = [...builtInComponents.values()];

const savedBlock: SavedBlockRecord = {
  id: 'saved-1',
  name: 'Launch hero',
  componentId: 'hero-centered',
  savedAt: '2026-10-07T10:00:00.000Z',
  envelope: '{}',
};

const pages = [createPage('home', 'Home', 'index'), createPage('pricing', 'Pricing', 'pricing')];

function labels(query: string, isReadOnly = false): string[] {
  const commands = buildPaletteCommands({ entries, savedBlocks: [savedBlock], pages, isReadOnly });
  return filterPaletteCommands(commands, query).map((command) => command.label);
}

describe('filterPaletteCommands', () => {
  it('finds pages, devices, saved blocks and site actions by any words', () => {
    expect(labels('pricing')).toContain('Go to Pricing');
    expect(labels('phone')).toContain('Show Phone (375 px)');
    expect(labels('launch')).toContain('Insert Launch hero');
    expect(labels('export')[0]).toBe('Export site');
  });

  it('puts labels that start with the first word ahead of other matches', () => {
    const results = labels('faq');
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((label) => label.toLowerCase().includes('faq'))).toBe(true);
  });

  it('caps the list', () => {
    expect(labels('').length).toBe(MAX_PALETTE_RESULTS);
  });

  it('offers only navigation and export in a read-only tab', () => {
    expect(labels('insert', true)).toEqual([]);
    expect(labels('find', true)).toEqual([]);
    expect(labels('export', true)).toContain('Export site');
  });
});

describe('runPaletteAction', () => {
  it('switches devices and opens dialogs', async () => {
    const store = createTestStore();
    await store.dispatch(runPaletteAction({ kind: 'device', mode: 'phone' }));
    expect(store.getState().editor.device).toBe('phone');
    await store.dispatch(runPaletteAction({ kind: 'dialog', dialog: 'export' }));
    expect(store.getState().editor.openDialog).toEqual({ kind: 'export' });
  });

  it('inserts a block on the current page', async () => {
    const store = createTestStore();
    const before = store.getState().project.blocks.ids.length;
    await store.dispatch(runPaletteAction({ kind: 'insert-block', componentId: 'faq-accordion' }));
    expect(store.getState().project.blocks.ids.length).toBe(before + 1);
  });
});
