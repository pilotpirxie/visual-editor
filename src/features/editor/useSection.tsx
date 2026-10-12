import type { JSX, ReactNode } from 'react';
import { sectionToggled } from '../../app/editorSlice';
import { dispatch, useStore } from '../../app/store';
import { Section } from '../../../packages/ui/src';

type SectionState = { isOpen: boolean; onToggle(isOpen: boolean): void };

function useSection(id: string, defaultOpen = true): SectionState {
  const storedState = useStore((state) => state.editor.sectionStates[id]);
  return {
    isOpen: storedState ?? defaultOpen,
    onToggle: (isOpen) => dispatch(sectionToggled({ id, isOpen })),
  };
}

type RememberedSectionProps = {
  id: string;
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
};

export function RememberedSection({
  id,
  title,
  defaultOpen = true,
  children,
}: RememberedSectionProps): JSX.Element {
  const section = useSection(id, defaultOpen);
  return (
    <Section title={title} isOpen={section.isOpen} onToggle={section.onToggle}>
      {children}
    </Section>
  );
}
