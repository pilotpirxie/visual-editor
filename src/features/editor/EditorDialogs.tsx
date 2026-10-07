import { Suspense, useLayoutEffect, useState, type JSX } from 'react';
import { dialogClosed, type EditorDialog } from '../../app/editorSlice';
import { dispatch, useStore } from '../../app/store';
import {
  CommandPalette,
  ExportDialog,
  FindReplaceDialog,
  HelpDialog,
  LicensesDialog,
  NewProjectDialog,
  ProjectSettingsDialog,
  SaveBlockDialog,
  SnapshotsDialog,
} from '../../app/lazyDialogs';
import { focusReturnTarget, restoreFocus } from '../../../packages/ui/src';

function closeDialog(): void {
  dispatch(dialogClosed());
}

function useFocusReturn(isOpen: boolean): void {
  const [returnTarget, setReturnTarget] = useState<HTMLElement | null>(null);
  const [wasOpen, setWasOpen] = useState(isOpen);
  if (wasOpen !== isOpen) {
    setWasOpen(isOpen);
    if (isOpen) setReturnTarget(focusReturnTarget(document.activeElement));
  }

  useLayoutEffect(() => {
    if (!isOpen) restoreFocus(returnTarget);
  }, [isOpen, returnTarget]);
}

function DialogFor({ dialog }: { dialog: EditorDialog }): JSX.Element | null {
  if (dialog.kind === 'export') {
    return <ExportDialog onClose={closeDialog} />;
  } else if (dialog.kind === 'settings') {
    return <ProjectSettingsDialog onClose={closeDialog} />;
  } else if (dialog.kind === 'licenses') {
    return <LicensesDialog onClose={closeDialog} />;
  } else if (dialog.kind === 'new-project') {
    return <NewProjectDialog onClose={closeDialog} />;
  } else if (dialog.kind === 'snapshots') {
    return <SnapshotsDialog onClose={closeDialog} />;
  } else if (dialog.kind === 'palette') {
    return <CommandPalette onClose={closeDialog} />;
  } else if (dialog.kind === 'help') {
    return <HelpDialog onClose={closeDialog} />;
  } else if (dialog.kind === 'find') {
    return <FindReplaceDialog onClose={closeDialog} />;
  } else if (dialog.kind === 'save-block') {
    return <SaveBlockDialog blockId={dialog.blockId} onClose={closeDialog} />;
  } else {
    return null;
  }
}

export function EditorDialogs(): JSX.Element | null {
  const dialog = useStore((state) => state.editor.openDialog);
  useFocusReturn(dialog !== null);
  if (dialog === null) return null;
  return (
    <Suspense fallback={null}>
      <DialogFor key={dialog.kind} dialog={dialog} />
    </Suspense>
  );
}
