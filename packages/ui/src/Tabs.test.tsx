import { describe, expect, it, vi } from 'vitest';
import { click, pressKey, render } from '../../../src/test/dom';
import { TabPanel, Tabs } from './Tabs';

const TABS = [
  { id: 'blocks', label: 'Blocks' },
  { id: 'layers', label: 'Layers' },
  { id: 'pages', label: 'Pages' },
];

function renderTabs(activeId: string, onChange = vi.fn()): HTMLDivElement {
  const { container } = render(
    <>
      <Tabs label="Library" idPrefix="lib" tabs={TABS} activeId={activeId} onChange={onChange} />
      <TabPanel idPrefix="lib" activeId={activeId}>
        Panel
      </TabPanel>
    </>,
  );
  return container;
}

describe('Tabs', () => {
  it('marks the active tab and links it to the panel', () => {
    const container = renderTabs('layers');
    const tabs = container.querySelectorAll('[role="tab"]');
    expect(tabs[1]?.getAttribute('aria-selected')).toBe('true');
    expect(tabs[1]?.getAttribute('tabindex')).toBe('0');
    expect(tabs[0]?.getAttribute('tabindex')).toBe('-1');
    const panel = container.querySelector('[role="tabpanel"]');
    expect(panel?.getAttribute('aria-labelledby')).toBe('lib-tab-layers');
    expect(tabs[1]?.getAttribute('aria-controls')).toBe(panel?.id);
  });

  it('switches tabs on click', () => {
    const onChange = vi.fn();
    const container = renderTabs('blocks', onChange);
    click(container.querySelectorAll('[role="tab"]')[2] ?? null);
    expect(onChange).toHaveBeenCalledWith('pages');
  });

  it('moves with the arrow keys and wraps around', () => {
    const onChange = vi.fn();
    const container = renderTabs('blocks', onChange);
    const list = container.querySelector('[role="tablist"]');
    if (list === null) throw new Error('No tab list');
    pressKey(list, 'ArrowLeft');
    expect(onChange).toHaveBeenLastCalledWith('pages');
    pressKey(list, 'ArrowRight');
    expect(onChange).toHaveBeenLastCalledWith('layers');
    pressKey(list, 'End');
    expect(onChange).toHaveBeenLastCalledWith('pages');
  });
});
