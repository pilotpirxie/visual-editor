type TabPair = { tab: HTMLElement; panel: HTMLElement };

const selectedPanelIds = new WeakMap<HTMLElement, string>();

function tabPairs(tablist: Element): TabPair[] {
  const pairs: TabPair[] = [];
  for (const tab of tablist.querySelectorAll<HTMLElement>('[aria-controls]')) {
    const panelId = tab.getAttribute('aria-controls') ?? '';
    const panel = tab.ownerDocument.getElementById(panelId);
    if (panel !== null) pairs.push({ tab, panel });
  }
  return pairs;
}

function hashPanelId(root: HTMLElement): string {
  const hash = root.ownerDocument.defaultView?.location.hash ?? '';
  return decodeURIComponent(hash.slice(1));
}

function initialIndex(root: HTMLElement, pairs: TabPair[]): number {
  for (const candidate of [hashPanelId(root), selectedPanelIds.get(root)]) {
    const index = pairs.findIndex(({ panel }) => panel.id === candidate);
    if (index >= 0) return index;
  }
  return 0;
}

function keyTarget(key: string, current: number, count: number): number | null {
  if (key === 'ArrowRight' || key === 'ArrowDown') {
    return (current + 1) % count;
  } else if (key === 'ArrowLeft' || key === 'ArrowUp') {
    return (current - 1 + count) % count;
  } else if (key === 'Home') {
    return 0;
  } else if (key === 'End') {
    return count - 1;
  } else {
    return null;
  }
}

function connectTabs(root: HTMLElement, tablist: HTMLElement, pairs: TabPair[]): () => void {
  const view = root.ownerDocument.defaultView;

  function select(index: number): void {
    for (const [pairIndex, { tab, panel }] of pairs.entries()) {
      const isSelected = pairIndex === index;
      tab.setAttribute('aria-selected', String(isSelected));
      tab.tabIndex = isSelected ? 0 : -1;
      panel.hidden = !isSelected;
    }
    const selected = pairs[index];
    if (selected !== undefined) selectedPanelIds.set(root, selected.panel.id);
  }

  function selectOnClick(event: Event): void {
    const target = event.target;
    if (!(target instanceof Node)) return;
    const index = pairs.findIndex(({ tab }) => tab.contains(target));
    if (index >= 0) select(index);
  }

  function moveWithKeys(event: KeyboardEvent): void {
    const current = pairs.findIndex(({ tab }) => tab === event.target);
    if (current < 0) return;
    const next = keyTarget(event.key, current, pairs.length);
    if (next === null) return;
    event.preventDefault();
    select(next);
    pairs[next]?.tab.focus();
  }

  function selectFromHash(): void {
    const index = pairs.findIndex(({ panel }) => panel.id === hashPanelId(root));
    if (index >= 0) select(index);
  }

  tablist.hidden = false;
  for (const { tab, panel } of pairs) {
    tab.setAttribute('role', 'tab');
    panel.setAttribute('role', 'tabpanel');
    panel.setAttribute('aria-labelledby', tab.id);
    panel.tabIndex = 0;
  }
  select(initialIndex(root, pairs));
  tablist.addEventListener('click', selectOnClick);
  tablist.addEventListener('keydown', moveWithKeys);
  view?.addEventListener('hashchange', selectFromHash);

  return () => {
    tablist.removeEventListener('click', selectOnClick);
    tablist.removeEventListener('keydown', moveWithKeys);
    view?.removeEventListener('hashchange', selectFromHash);
    tablist.hidden = true;
    for (const { tab, panel } of pairs) {
      tab.removeAttribute('role');
      tab.removeAttribute('aria-selected');
      tab.removeAttribute('tabindex');
      panel.removeAttribute('role');
      panel.removeAttribute('aria-labelledby');
      panel.removeAttribute('tabindex');
      panel.hidden = false;
    }
  };
}

siteRuntime.register({
  name: 'tabs',
  init(root) {
    const tablist = root.querySelector<HTMLElement>('[role="tablist"]');
    const pairs = tablist === null ? [] : tabPairs(tablist);
    if (tablist === null || pairs.length === 0) {
      console.warn('siteRuntime tabs: needs a [role="tablist"] of [aria-controls] buttons', root);
      return () => {};
    }
    return connectTabs(root, tablist, pairs);
  },
});
