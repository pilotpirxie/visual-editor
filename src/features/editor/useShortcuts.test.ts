import { describe, expect, it } from 'vitest';
import { blockSelected } from '../../app/editorSlice';
import { blockValueSet } from '../../app/projectSlice';
import { createTestStore, homePage, type TestStore } from '../../test/fixtures';
import { applyShortcut, shortcutFor, type ShortcutKeyEvent } from './useShortcuts';

function keyEvent(key: string, overrides: Partial<ShortcutKeyEvent> = {}): ShortcutKeyEvent {
  return {
    key,
    metaKey: false,
    ctrlKey: false,
    altKey: false,
    shiftKey: false,
    isComposing: false,
    defaultPrevented: false,
    target: document.body,
    ...overrides,
  };
}

function placeInside(container: HTMLElement, tag: string): Element {
  const element = document.createElement(tag);
  container.append(element);
  document.body.append(container);
  return element;
}

function propertiesPanel(): HTMLElement {
  const panel = document.createElement('aside');
  panel.className = 've-properties';
  return panel;
}

function blockIds(store: TestStore): string[] {
  return homePage(store.getState().project).blockIds;
}

describe('shortcutFor', () => {
  it('maps Cmd or Ctrl with Z and Y to undo and redo', () => {
    expect(shortcutFor(keyEvent('z', { metaKey: true }))).toEqual({ kind: 'undo' });
    expect(shortcutFor(keyEvent('Z', { metaKey: true, shiftKey: true }))).toEqual({
      kind: 'redo',
    });
    expect(shortcutFor(keyEvent('y', { ctrlKey: true }))).toEqual({ kind: 'redo' });
  });

  it('keeps undo and redo working while typing in a field', () => {
    const input = document.createElement('input');
    expect(shortcutFor(keyEvent('z', { ctrlKey: true, target: input }))).toEqual({
      kind: 'undo',
    });
  });

  it('ignores history keys with Alt or during text composition', () => {
    expect(shortcutFor(keyEvent('z', { metaKey: true, altKey: true }))).toBeNull();
    expect(shortcutFor(keyEvent('z', { metaKey: true, isComposing: true }))).toBeNull();
  });

  it('maps block keys when focus is on the page', () => {
    expect(shortcutFor(keyEvent('Delete'))).toEqual({ kind: 'remove' });
    expect(shortcutFor(keyEvent('Backspace'))).toEqual({ kind: 'remove' });
    expect(shortcutFor(keyEvent('d', { metaKey: true }))).toEqual({ kind: 'duplicate' });
    expect(shortcutFor(keyEvent('ArrowUp', { altKey: true }))).toEqual({
      kind: 'move',
      offset: -1,
    });
    expect(shortcutFor(keyEvent('ArrowDown', { altKey: true }))).toEqual({
      kind: 'move',
      offset: 1,
    });
    expect(shortcutFor(keyEvent('Escape'))).toEqual({ kind: 'clear-selection' });
  });

  it('ignores block keys while typing, inside dialogs or after another handler used the key', () => {
    const editable = document.createElement('div');
    editable.setAttribute('contenteditable', 'true');
    expect(
      shortcutFor(keyEvent('Backspace', { target: document.createElement('textarea') })),
    ).toBeNull();
    expect(shortcutFor(keyEvent('Delete', { target: editable }))).toBeNull();
    expect(
      shortcutFor(
        keyEvent('Delete', { target: placeInside(document.createElement('dialog'), 'button') }),
      ),
    ).toBeNull();
    expect(shortcutFor(keyEvent('Delete', { defaultPrevented: true }))).toBeNull();
  });

  it('lets Escape clear the selection from the properties panel but not delete blocks', () => {
    const target = placeInside(propertiesPanel(), 'button');
    expect(shortcutFor(keyEvent('Escape', { target }))).toEqual({ kind: 'clear-selection' });
    expect(shortcutFor(keyEvent('Delete', { target }))).toBeNull();
  });

  it('returns null for keys without a shortcut', () => {
    expect(shortcutFor(keyEvent('a'))).toBeNull();
    expect(shortcutFor(keyEvent('ArrowUp'))).toBeNull();
  });
});

describe('applyShortcut', () => {
  it('undoes and redoes and reports the key as used', () => {
    const store = createTestStore();
    const hero = blockIds(store)[1];
    store.dispatch(blockValueSet(hero, 'title', 'Changed', 'discrete'));
    expect(store.dispatch(applyShortcut({ kind: 'undo' }))).toBe(true);
    expect(store.getState().history.future).toHaveLength(1);
    expect(store.dispatch(applyShortcut({ kind: 'redo' }))).toBe(true);
    expect(store.getState().history.past).toHaveLength(1);
  });

  it('clears the selection without claiming the Escape key', () => {
    const store = createTestStore();
    store.dispatch(blockSelected(blockIds(store)[0]));
    expect(store.dispatch(applyShortcut({ kind: 'clear-selection' }))).toBe(false);
    expect(store.getState().editor.selectedBlockId).toBeNull();
  });

  it('removes, duplicates and moves the selected block', () => {
    const store = createTestStore();
    const [nav, hero] = blockIds(store);
    store.dispatch(blockSelected(hero));
    expect(store.dispatch(applyShortcut({ kind: 'move', offset: -1 }))).toBe(true);
    expect(blockIds(store)[0]).toBe(hero);
    store.dispatch(applyShortcut({ kind: 'duplicate' }));
    expect(blockIds(store)).toHaveLength(5);
    store.dispatch(blockSelected(nav));
    store.dispatch(applyShortcut({ kind: 'remove' }));
    expect(blockIds(store)).not.toContain(nav);
  });

  it('leaves block keys alone when nothing is selected', () => {
    const store = createTestStore();
    expect(store.dispatch(applyShortcut({ kind: 'remove' }))).toBe(false);
    expect(blockIds(store)).toHaveLength(4);
  });
});
