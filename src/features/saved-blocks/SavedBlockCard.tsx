import { useState, type JSX, type KeyboardEvent } from 'react';
import { describeError } from '../../app/errors';
import { noticeShown } from '../../app/editorSlice';
import { dispatch } from '../../app/store';
import { builtInComponents } from '../../components/registry';
import type { SavedBlockRecord } from '../../persistence/db';
import { insertSavedBlock, removeSavedBlock, renameSavedBlock } from './savedBlockActions';
import { Button, Icon, MenuButton, TextInput } from '../../../packages/ui/src';

const THUMBNAIL_WIDTH = 640;
const THUMBNAIL_HEIGHT = 400;

type CardMode = 'idle' | 'renaming' | 'confirming-delete';

function reportFailure(action: string, error: unknown): void {
  console.error(`Could not ${action}`, error);
  dispatch(noticeShown('error', `Could not ${action}: ${describeError(error)}`));
}

function thumbnailOf(record: SavedBlockRecord): string | null {
  if (record.componentId === null) return null;
  return builtInComponents.get(record.componentId)?.thumbnail ?? null;
}

export function SavedBlockCard({ record }: { record: SavedBlockRecord }): JSX.Element {
  const [mode, setMode] = useState<CardMode>('idle');
  const thumbnail = thumbnailOf(record);

  function insert(): void {
    dispatch(insertSavedBlock(record)).catch((error: unknown) => {
      reportFailure(`add “${record.name}”`, error);
    });
  }

  function finishRename(value: string | null): void {
    setMode('idle');
    const trimmed = value?.trim() ?? '';
    if (trimmed === '' || trimmed === record.name) return;
    dispatch(renameSavedBlock(record, trimmed)).catch((error: unknown) => {
      reportFailure(`rename “${record.name}”`, error);
    });
  }

  function remove(): void {
    setMode('idle');
    dispatch(removeSavedBlock(record)).catch((error: unknown) => {
      reportFailure(`delete “${record.name}”`, error);
    });
  }

  function onRenameKeyDown(event: KeyboardEvent<HTMLInputElement>): void {
    if (event.key === 'Enter') {
      finishRename(event.currentTarget.value);
    } else if (event.key === 'Escape') {
      finishRename(null);
    }
  }

  return (
    <li className="ve-saved-block">
      <button type="button" className="ve-component-card" onClick={insert}>
        {thumbnail === null ? (
          <span className="ve-thumbnail-placeholder" aria-hidden="true">
            <Icon name="bookmark" />
          </span>
        ) : (
          <img
            src={thumbnail}
            alt=""
            width={THUMBNAIL_WIDTH}
            height={THUMBNAIL_HEIGHT}
            loading="lazy"
            decoding="async"
            draggable={false}
          />
        )}
        {mode !== 'renaming' && <span>{record.name}</span>}
      </button>
      {mode === 'renaming' && (
        <TextInput
          aria-label="Saved block name"
          defaultValue={record.name}
          autoFocus
          onKeyDown={onRenameKeyDown}
          onBlur={(event) => finishRename(event.currentTarget.value)}
        />
      )}
      {mode === 'confirming-delete' && (
        <div className="ve-saved-block-confirm">
          <Button variant="secondary" onClick={() => setMode('idle')}>
            Keep
          </Button>
          <Button variant="danger" onClick={remove}>
            Delete
          </Button>
        </div>
      )}
      {mode === 'idle' && (
        <MenuButton
          className="ve-saved-block-menu"
          label={`More actions for “${record.name}”`}
          icon="ellipsis"
          isLabelShown={false}
          items={[
            { id: 'rename', label: 'Rename', onSelect: () => setMode('renaming') },
            {
              id: 'delete',
              label: 'Delete',
              isDanger: true,
              onSelect: () => setMode('confirming-delete'),
            },
          ]}
        />
      )}
    </li>
  );
}
