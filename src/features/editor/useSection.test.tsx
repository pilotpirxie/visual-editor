import type { JSX } from 'react';
import { beforeEach, describe, expect, it } from 'vitest';
import { sectionToggled } from '../../app/editorSlice';
import { dispatch, store } from '../../app/store';
import { render, runInAct } from '../../test/dom';
import { loadIntoAppStore } from '../../test/fixtures';
import { useSection } from './useSection';

function SectionProbe({ id, defaultOpen }: { id: string; defaultOpen?: boolean }): JSX.Element {
  const section = useSection(id, defaultOpen);
  return (
    <button
      type="button"
      data-open={section.isOpen}
      onClick={() => section.onToggle(!section.isOpen)}
    >
      Toggle
    </button>
  );
}

function probeState(container: HTMLElement): string | null {
  return container.querySelector('button')?.getAttribute('data-open') ?? null;
}

beforeEach(() => {
  loadIntoAppStore();
  runInAct(() => {
    for (const id of Object.keys(store.getState().editor.sectionStates)) {
      dispatch(sectionToggled({ id, isOpen: true }));
    }
  });
});

describe('useSection', () => {
  it('uses the default until the user toggles the section', () => {
    const { container } = render(<SectionProbe id="probe:closed" defaultOpen={false} />);
    expect(probeState(container)).toBe('false');
    const open = render(<SectionProbe id="probe:open" />);
    expect(probeState(open.container)).toBe('true');
  });

  it('keeps the toggled state for the next time the section is shown', () => {
    const first = render(<SectionProbe id="probe:remembered" />);
    runInAct(() => first.container.querySelector('button')?.click());
    expect(store.getState().editor.sectionStates['probe:remembered']).toBe(false);
    first.unmount();
    const second = render(<SectionProbe id="probe:remembered" />);
    expect(probeState(second.container)).toBe('false');
  });
});
