import { Suspense, useSyncExternalStore, type JSX } from 'react';
import { LoadPackDialog, ManagePacksDialog } from '../../app/lazyDialogs';
import { packCommands } from './packCommands';
import './blockPacks.css';

export function PackDialogs(): JSX.Element | null {
  const dialog = useSyncExternalStore(packCommands.subscribe, packCommands.getDialog);
  if (dialog === null) return null;
  return (
    <Suspense fallback={null}>
      {dialog.kind === 'manage' ? (
        <ManagePacksDialog />
      ) : (
        <LoadPackDialog key={dialog.fileName} fileName={dialog.fileName} reading={dialog.reading} />
      )}
    </Suspense>
  );
}
