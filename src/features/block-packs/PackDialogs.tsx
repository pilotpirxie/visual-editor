import { useSyncExternalStore, type JSX } from 'react';
import { LoadPackDialog } from './LoadPackDialog';
import { ManagePacksDialog } from './ManagePacksDialog';
import { packCommands } from './packCommands';
import './blockPacks.css';

export function PackDialogs(): JSX.Element | null {
  const dialog = useSyncExternalStore(packCommands.subscribe, packCommands.getDialog);
  if (dialog === null) return null;
  if (dialog.kind === 'manage') return <ManagePacksDialog />;
  return (
    <LoadPackDialog key={dialog.fileName} fileName={dialog.fileName} reading={dialog.reading} />
  );
}
