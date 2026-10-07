import { describe, expect, it, vi } from 'vitest';
import { render, runInAct } from '../../../src/test/dom';
import { Section } from './Section';

function toggle(details: HTMLDetailsElement | null): void {
  if (details === null) throw new Error('No section');
  runInAct(() => {
    details.open = !details.open;
    details.dispatchEvent(new Event('toggle'));
  });
}

describe('Section', () => {
  it('shows its title as a heading and starts open', () => {
    const { container } = render(<Section title="Colors">Swatches</Section>);
    expect(container.querySelector('summary h3')?.textContent).toBe('Colors');
    expect(container.querySelector('details')?.open).toBe(true);
  });

  it('starts collapsed when asked and remembers its own state', () => {
    const { container } = render(
      <Section title="Presets" defaultOpen={false}>
        List
      </Section>,
    );
    const details = container.querySelector('details');
    expect(details?.open).toBe(false);
    toggle(details);
    expect(details?.open).toBe(true);
  });

  it('follows the state it is given and reports toggles', () => {
    const onToggle = vi.fn();
    const { container, rerender } = render(
      <Section title="Typography" isOpen onToggle={onToggle}>
        Fonts
      </Section>,
    );
    const details = container.querySelector('details');
    toggle(details);
    expect(onToggle).toHaveBeenCalledWith(false);
    rerender(
      <Section title="Typography" isOpen={false} onToggle={onToggle}>
        Fonts
      </Section>,
    );
    expect(container.querySelector('details')?.open).toBe(false);
  });
});
