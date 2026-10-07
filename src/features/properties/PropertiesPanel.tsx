import { useEffect, useRef, type JSX } from 'react';
import {
  focusRequestHandled,
  propertiesTabChanged,
  type PropertiesTab,
} from '../../app/editorSlice';
import { sharedSlotOf, slotForCategory } from '../../app/blockLists';
import { blockShared, blockUnshared } from '../../app/projectSlice';
import { dispatch, selectCurrentPage, useStore } from '../../app/store';
import { blockComponentId, blockLabel, registry } from '../../components/registry';
import type { Block } from '../../app/types';
import { CATEGORIES, type ComponentDefinition } from '../../components/types';
import { AdvancedTab } from './AdvancedTab';
import { CodeField } from './CodeField';
import { ContentTab } from './ContentTab';
import { PageSettingsPanel } from './PageSettingsPanel';
import { StyleTab } from './StyleTab';
import './properties.css';

const TEXT_ENTRY_TARGETS = 'input, textarea, select, [contenteditable="true"]';
const BUTTON_TARGETS = 'button, summary';

type TabOption = { id: PropertiesTab; label: string };

const COMPONENT_TABS: TabOption[] = [
  { id: 'content', label: 'Content' },
  { id: 'style', label: 'Style' },
  { id: 'advanced', label: 'Advanced' },
];

const HTML_TABS: TabOption[] = [
  { id: 'code', label: 'Code' },
  { id: 'advanced', label: 'Advanced' },
];

function shownTab(block: Block, activeTab: PropertiesTab): PropertiesTab {
  if (block.kind === 'html') return activeTab === 'advanced' ? 'advanced' : 'code';
  return activeTab === 'code' ? 'content' : activeTab;
}

function focusField(container: HTMLElement, path: string): boolean {
  const field = container.querySelector(`[data-field-path="${CSS.escape(path)}"]`);
  if (field === null) return false;
  const details = field.querySelector('details');
  if (details !== null) details.open = true;
  const target =
    field.querySelector<HTMLElement>(TEXT_ENTRY_TARGETS) ??
    field.querySelector<HTMLElement>(BUTTON_TARGETS);
  if (target === null) return false;
  target.focus();
  return target.ownerDocument.activeElement === target;
}

function categoryLabelOf(definition: ComponentDefinition): string | null {
  for (const category of CATEGORIES) {
    if (category.id === definition.category) return category.label;
  }
  return null;
}

function SharedSwitch({
  blockId,
  definition,
}: {
  blockId: string;
  definition: ComponentDefinition;
}): JSX.Element | null {
  const isShared = useStore((state) => sharedSlotOf(state.project, blockId) !== null);
  const pageId = useStore((state) => selectCurrentPage(state).id);
  const slot = slotForCategory(definition.category);
  if (slot === null) return null;

  function toggle(isChecked: boolean): void {
    if (slot === null) return;
    if (isChecked) {
      dispatch(blockShared({ blockId, slot, pageId }));
    } else {
      dispatch(blockUnshared({ blockId, pageId }));
    }
  }

  return (
    <div className="ve-control">
      <label className="ve-switch" htmlFor="ve-shared-switch">
        <input
          id="ve-shared-switch"
          type="checkbox"
          role="switch"
          checked={isShared}
          aria-describedby="ve-shared-help"
          onChange={(event) => toggle(event.target.checked)}
        />
        <span className="ve-control-label">Shared on all pages</span>
      </label>
      <p id="ve-shared-help" className="ve-control-help">
        {isShared
          ? `Shown in the shared ${slot} of every page. Edits here change every page.`
          : `Moves this block into the shared ${slot}, so every page shows it.`}
      </p>
    </div>
  );
}

function PropertiesTabs({
  tabs,
  activeTab,
}: {
  tabs: TabOption[];
  activeTab: PropertiesTab;
}): JSX.Element {
  return (
    <div className="ve-tabs" role="tablist" aria-label="Block settings">
      {tabs.map(({ id, label }) => (
        <button
          key={id}
          type="button"
          role="tab"
          id={`ve-properties-tab-${id}`}
          aria-selected={activeTab === id}
          aria-controls="ve-properties-panel"
          onClick={() => dispatch(propertiesTabChanged(id))}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

export function PropertiesPanel(): JSX.Element {
  const block = useStore((state) => {
    const { selectedBlockId } = state.editor;
    if (selectedBlockId === null) return null;
    return state.project.blocks.entities[selectedBlockId] ?? null;
  });
  const focusRequest = useStore((state) => state.editor.focusRequest);
  const compactView = useStore((state) => state.editor.compactView);
  const isCollapsed = useStore((state) => state.editor.panels.right.collapsed);
  const activeTab = useStore((state) => state.editor.propertiesTab);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const body = bodyRef.current;
    if (focusRequest === null || body === null) return;
    const hasFocused = focusField(body, focusRequest.path);
    if (hasFocused) dispatch(focusRequestHandled());
  }, [focusRequest, compactView, isCollapsed, activeTab]);

  if (block === null) {
    return (
      <aside className="ve-panel ve-properties" aria-label="Properties">
        <PageSettingsPanel />
      </aside>
    );
  }

  const componentId = blockComponentId(block);
  const component = componentId === null ? undefined : registry.get(componentId);
  const definition = component === undefined ? null : component.definition;
  const categoryLabel = definition === null ? null : categoryLabelOf(definition);
  const tab = shownTab(block, activeTab);
  if (block.kind === 'html') {
    return (
      <aside className="ve-panel ve-properties" aria-label="Properties">
        <header className="ve-properties-section">
          <h2 className="ve-properties-title">HTML block</h2>
          {definition !== null && <p className="ve-muted">Converted from {definition.name}</p>}
          {definition !== null && <SharedSwitch blockId={block.id} definition={definition} />}
        </header>
        <PropertiesTabs tabs={HTML_TABS} activeTab={tab} />
        <div
          className="ve-properties-body"
          key={block.id}
          ref={bodyRef}
          role="tabpanel"
          id="ve-properties-panel"
          aria-labelledby={`ve-properties-tab-${tab}`}
        >
          {tab === 'code' && <CodeField id="ve-html-code" blockId={block.id} html={block.html} />}
          {tab === 'advanced' && <AdvancedTab block={block} />}
        </div>
      </aside>
    );
  }
  const title = definition === null ? blockLabel(block) : definition.name;

  return (
    <aside className="ve-panel ve-properties" aria-label="Properties">
      <header className="ve-properties-section">
        <h2 className="ve-properties-title">{title}</h2>
        {categoryLabel !== null && <p className="ve-muted">{categoryLabel}</p>}
        {definition !== null && <SharedSwitch blockId={block.id} definition={definition} />}
      </header>
      {definition !== null && <PropertiesTabs tabs={COMPONENT_TABS} activeTab={tab} />}
      <div
        className="ve-properties-body"
        key={block.id}
        ref={bodyRef}
        role="tabpanel"
        id="ve-properties-panel"
        aria-labelledby={`ve-properties-tab-${tab}`}
      >
        {definition !== null && tab === 'content' && (
          <ContentTab block={block} definition={definition} />
        )}
        {definition !== null && tab === 'style' && (
          <StyleTab block={block} definition={definition} />
        )}
        {definition !== null && tab === 'advanced' && <AdvancedTab block={block} />}
      </div>
    </aside>
  );
}
