import { useEffect, useRef, type JSX } from 'react';
import {
  focusRequestHandled,
  propertiesTabChanged,
  type PropertiesTab,
} from '../../app/editorSlice';
import { sharedSlotOf, slotForCategory } from '../../app/blockLists';
import { blockShared, blockUnshared } from '../../app/projectSlice';
import { dispatch, selectCurrentPage, useStore } from '../../app/store';
import { blockComponentId, blockLabel, definitionOf } from '../../components/registry';
import type { Block } from '../../app/types';
import type { PackBlock } from '../../components/types';
import { categoryLabel, type ComponentDefinition } from '../../components/types';
import { AdvancedTab } from './AdvancedTab';
import { CodeField } from './CodeField';
import { ContentTab } from './ContentTab';
import { PageSettingsPanel } from './PageSettingsPanel';
import { StyleTab } from './StyleTab';
import { removeBlock } from '../editor/blockActions';
import { BackToCanvasButton } from '../editor/CompactTabs';
import { Button, Switch, Tabs, Title } from '../../../packages/ui/src';
import './properties.css';

const TABS_ID = 've-properties';

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
  let section = field.closest('details');
  while (section !== null) {
    section.open = true;
    section = section.parentElement?.closest('details') ?? null;
  }
  const details = field.querySelector('details');
  if (details !== null) details.open = true;
  const target =
    field.querySelector<HTMLElement>(TEXT_ENTRY_TARGETS) ??
    field.querySelector<HTMLElement>(BUTTON_TARGETS);
  if (target === null) return false;
  target.focus();
  return target.ownerDocument.activeElement === target;
}

function PanelHeading({ title, detail }: { title: string; detail: string | null }): JSX.Element {
  return (
    <div className="ve-panel-heading">
      <Title>{title}</Title>
      {detail !== null && <span className="ve-panel-detail">{detail}</span>}
      <BackToCanvasButton />
    </div>
  );
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
    <Switch
      id="ve-shared-switch"
      label="Shared on all pages"
      checked={isShared}
      onChange={(event) => toggle(event.target.checked)}
    />
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
    <Tabs
      label="Block settings"
      idPrefix={TABS_ID}
      tabs={tabs}
      activeId={activeTab}
      onChange={(id) => {
        const picked = tabs.find((tab) => tab.id === id);
        if (picked !== undefined) dispatch(propertiesTabChanged(picked.id));
      }}
    />
  );
}

function MissingComponent({ blockId }: { blockId: string }): JSX.Element {
  return (
    <div className="ve-missing-component">
      <p>
        This block’s component isn’t available, so it can’t be edited or shown. Its content is kept
        in case the component comes back.
      </p>
      <Button variant="danger" icon="trash" onClick={() => dispatch(removeBlock(blockId))}>
        Delete block
      </Button>
    </div>
  );
}

type BlockSettingsProps = {
  block: Block;
  definition: ComponentDefinition | null;
  tab: PropertiesTab;
};

function BlockSettings({ block, definition, tab }: BlockSettingsProps): JSX.Element | null {
  if (block.kind === 'html') {
    if (tab === 'code') return <CodeField id="ve-html-code" blockId={block.id} html={block.html} />;
    return tab === 'advanced' ? <AdvancedTab block={block} /> : null;
  }
  if (definition === null) return <MissingComponent blockId={block.id} />;
  if (tab === 'content') {
    return <ContentTab block={block} definition={definition} />;
  } else if (tab === 'style') {
    return <StyleTab block={block} definition={definition} />;
  } else if (tab === 'advanced') {
    return <AdvancedTab block={block} />;
  } else {
    return null;
  }
}

type BlockHeading = { title: string; detail: string | null; tabs: TabOption[] | null };

function blockHeadingOf(
  block: Block,
  definition: ComponentDefinition | null,
  packBlocks: Record<string, PackBlock>,
): BlockHeading {
  if (block.kind === 'html') {
    const detail = definition === null ? null : `From ${definition.name}`;
    return { title: 'HTML block', detail, tabs: HTML_TABS };
  }
  if (definition === null) {
    return { title: blockLabel(block, { packBlocks }), detail: null, tabs: null };
  }
  return {
    title: definition.name,
    detail: categoryLabel(definition.category),
    tabs: COMPONENT_TABS,
  };
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
  const packBlocks = useStore((state) => state.project.packBlocks);
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
  const definition =
    componentId === null ? null : (definitionOf({ packBlocks }, componentId) ?? null);
  const tab = shownTab(block, activeTab);
  const heading = blockHeadingOf(block, definition, packBlocks);

  return (
    <aside className="ve-panel ve-properties" aria-label="Properties">
      <header className="ve-panel-header">
        <PanelHeading title={heading.title} detail={heading.detail} />
        {definition !== null && <SharedSwitch blockId={block.id} definition={definition} />}
      </header>
      {heading.tabs !== null && <PropertiesTabs tabs={heading.tabs} activeTab={tab} />}
      <div
        className="ve-properties-body"
        key={block.id}
        ref={bodyRef}
        role="tabpanel"
        id="ve-properties-panel"
        aria-labelledby={`ve-properties-tab-${tab}`}
      >
        <BlockSettings block={block} definition={definition} tab={tab} />
      </div>
    </aside>
  );
}
