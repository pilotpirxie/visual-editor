import type { JSX, KeyboardEvent, ReactNode } from 'react';
import { classNames } from './classNames';
import { Icon } from './Icon';
import { rovingIndex, type RovingOrientation } from './roving';
import './Tabs.css';

export type TabItem = { id: string; label: string; icon?: string };

type TabsProps = {
  label: string;
  idPrefix: string;
  tabs: readonly TabItem[];
  activeId: string;
  className?: string;
  orientation?: RovingOrientation;
  onChange(id: string): void;
};

export function tabId(idPrefix: string, id: string): string {
  return `${idPrefix}-tab-${id}`;
}

export function tabPanelId(idPrefix: string): string {
  return `${idPrefix}-panel`;
}

export function Tabs({
  label,
  idPrefix,
  tabs,
  activeId,
  className,
  orientation = 'horizontal',
  onChange,
}: TabsProps): JSX.Element {
  function moveFocus(event: KeyboardEvent<HTMLDivElement>): void {
    const current = tabs.findIndex((tab) => tab.id === activeId);
    const next = rovingIndex(event.key, current, tabs.length, orientation);
    const nextTab = next === null ? undefined : tabs[next];
    if (nextTab === undefined) return;
    event.preventDefault();
    onChange(nextTab.id);
    event.currentTarget.ownerDocument.getElementById(tabId(idPrefix, nextTab.id))?.focus();
  }

  return (
    <div
      className={classNames('ui-tabs', className)}
      role="tablist"
      aria-label={label}
      aria-orientation={orientation}
      onKeyDown={moveFocus}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeId;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={tabId(idPrefix, tab.id)}
            aria-selected={isActive}
            aria-controls={tabPanelId(idPrefix)}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange(tab.id)}
          >
            {tab.icon !== undefined && <Icon name={tab.icon} />}
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}

type TabPanelProps = {
  idPrefix: string;
  activeId: string;
  className?: string;
  children: ReactNode;
};

export function TabPanel({ idPrefix, activeId, className, children }: TabPanelProps): JSX.Element {
  return (
    <div
      className={classNames('ui-tab-panel', className)}
      role="tabpanel"
      id={tabPanelId(idPrefix)}
      aria-labelledby={tabId(idPrefix, activeId)}
    >
      {children}
    </div>
  );
}
