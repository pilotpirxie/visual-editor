import { sectionToggled } from '../../app/editorSlice';
import { dispatch, useStore } from '../../app/store';

type SectionState = { isOpen: boolean; onToggle(isOpen: boolean): void };

export function useSection(id: string, defaultOpen = true): SectionState {
  const storedState = useStore((state) => state.editor.sectionStates[id]);
  return {
    isOpen: storedState ?? defaultOpen,
    onToggle: (isOpen) => dispatch(sectionToggled({ id, isOpen })),
  };
}
