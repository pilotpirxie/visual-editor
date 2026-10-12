import { beforeEach, describe, expect, it } from 'vitest';
import { sectionToggled } from '../../app/editorSlice';
import { dispatch, store } from '../../app/store';
import { render, runInAct } from '../../test/dom';
import { loadIntoAppStore } from '../../test/fixtures';
import { RememberedSection } from './useSection';

function detailsOf(container: HTMLElement, title: string): HTMLDetailsElement {
  for (const details of container.querySelectorAll('details')) {
    if (details.querySelector('.ui-section-title')?.textContent === title) return details;
  }
  throw new Error(`No section titled ${title}`);
}

function toggle(details: HTMLDetailsElement): void {
  runInAct(() => {
    details.open = !details.open;
    details.dispatchEvent(new Event('toggle'));
  });
}

beforeEach(() => {
  loadIntoAppStore();
  runInAct(() => {
    for (const id of Object.keys(store.getState().editor.sectionStates)) {
      dispatch(sectionToggled({ id, isOpen: true }));
    }
  });
});

describe('RememberedSection', () => {
  it('shows its title and content, open unless asked otherwise', () => {
    const { container } = render(
      <>
        <RememberedSection id="probe:open" title="Colors">
          <p>Swatches</p>
        </RememberedSection>
        <RememberedSection id="probe:closed" title="Motion" defaultOpen={false}>
          <p>Durations</p>
        </RememberedSection>
      </>,
    );
    const colors = detailsOf(container, 'Colors');
    expect(colors.open).toBe(true);
    expect(colors.querySelector('.ui-section-body')?.textContent).toBe('Swatches');
    expect(detailsOf(container, 'Motion').open).toBe(false);
  });

  it('keeps the toggled state for the next time the section is shown', () => {
    const first = render(
      <RememberedSection id="probe:remembered" title="Spacing">
        <p>Steps</p>
      </RememberedSection>,
    );
    toggle(detailsOf(first.container, 'Spacing'));
    expect(store.getState().editor.sectionStates['probe:remembered']).toBe(false);
    first.unmount();
    const second = render(
      <RememberedSection id="probe:remembered" title="Spacing">
        <p>Steps</p>
      </RememberedSection>,
    );
    expect(detailsOf(second.container, 'Spacing').open).toBe(false);
  });

  it('opens a section that starts closed and remembers it over the default', () => {
    const first = render(
      <RememberedSection id="probe:opened" title="Shape" defaultOpen={false}>
        <p>Corners</p>
      </RememberedSection>,
    );
    toggle(detailsOf(first.container, 'Shape'));
    expect(store.getState().editor.sectionStates['probe:opened']).toBe(true);
    expect(detailsOf(first.container, 'Shape').open).toBe(true);
  });

  it('remembers each section on its own', () => {
    const { container } = render(
      <>
        <RememberedSection id="probe:first" title="First">
          <p>One</p>
        </RememberedSection>
        <RememberedSection id="probe:second" title="Second">
          <p>Two</p>
        </RememberedSection>
      </>,
    );
    toggle(detailsOf(container, 'First'));
    expect(detailsOf(container, 'First').open).toBe(false);
    expect(detailsOf(container, 'Second').open).toBe(true);
    expect(store.getState().editor.sectionStates['probe:second']).toBeUndefined();
  });
});
