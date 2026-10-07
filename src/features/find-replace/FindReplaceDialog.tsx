import { useDeferredValue, useMemo, useState, type FormEvent, type JSX } from 'react';
import {
  blockSelected,
  dialogClosed,
  dialogOpened,
  fieldFocusRequested,
  noticeShown,
} from '../../app/editorSlice';
import { textReplaced } from '../../app/projectSlice';
import { dispatch, useStore } from '../../app/store';
import type { Project } from '../../app/types';
import { blockLabel } from '../../components/registry';
import { openPage } from '../pages/pageActions';
import {
  findMatches,
  planReplacement,
  replacementCount,
  type FindMatch,
  type SearchOptions,
} from './textSearch';
import './findReplace.css';
import {
  Button,
  Checkbox,
  closeDialogOf,
  Dialog,
  DialogActions,
  DialogBody,
  Field,
  Section,
  TextInput,
} from '../../../packages/ui/src';

const TITLE_ID = 've-find-title';
const FIND_ID = 've-find-query';
const REPLACE_ID = 've-find-replacement';
const SHARED_GROUP = 'shared';
const SITE_GROUP = 'site';

type MatchGroup = { id: string; title: string; matches: FindMatch[] };

function groupIdOf(match: FindMatch): string {
  const { location } = match;
  if (location.kind === 'setting') return SITE_GROUP;
  if (location.kind === 'page-seo') return location.pageId;
  return location.pageId ?? SHARED_GROUP;
}

function groupTitle(project: Project, groupId: string): string {
  if (groupId === SITE_GROUP) return 'Site';
  if (groupId === SHARED_GROUP) return 'Shared blocks';
  return project.pages.entities[groupId]?.name ?? 'A page';
}

function groupMatches(project: Project, matches: FindMatch[]): MatchGroup[] {
  const groups = new Map<string, MatchGroup>();
  for (const match of matches) {
    const id = groupIdOf(match);
    let group = groups.get(id);
    if (group === undefined) {
      group = { id, title: groupTitle(project, id), matches: [] };
      groups.set(id, group);
    }
    group.matches.push(match);
  }
  return [...groups.values()];
}

function placeOf(project: Project, match: FindMatch): string {
  const { location } = match;
  if (location.kind !== 'block') return match.label;
  const block = project.blocks.entities[location.blockId];
  const blockName = block === undefined ? 'Block' : blockLabel(block, project);
  return `${blockName} › ${match.label}`;
}

function showMatch(match: FindMatch): void {
  const { location } = match;
  dispatch(dialogClosed());
  if (location.kind === 'setting') {
    dispatch(dialogOpened({ kind: 'settings' }));
  } else if (location.kind === 'page-seo') {
    dispatch(openPage(location.pageId));
    dispatch(blockSelected(null));
  } else {
    if (location.pageId !== null) dispatch(openPage(location.pageId));
    dispatch(fieldFocusRequested({ blockId: location.blockId, path: location.path }));
  }
}

type MatchRowProps = {
  project: Project;
  match: FindMatch;
  isSelected: boolean;
  canReplace: boolean;
  onToggle(isSelected: boolean): void;
};

function MatchRow({
  project,
  match,
  isSelected,
  canReplace,
  onToggle,
}: MatchRowProps): JSX.Element {
  const { preview } = match;
  const text = (
    <span className="ve-find-match">
      <span className="ve-find-place">{placeOf(project, match)}</span>
      <span className="ve-find-preview">
        {preview.before}
        <mark>{preview.match}</mark>
        {preview.after}
      </span>
    </span>
  );
  return (
    <li className="ve-find-row">
      {canReplace ? (
        <Checkbox
          label={text}
          checked={isSelected}
          onChange={(event) => onToggle(event.currentTarget.checked)}
        />
      ) : (
        text
      )}
      <Button variant="ghost" onClick={() => showMatch(match)}>
        Show
      </Button>
    </li>
  );
}

function matchesLabel(count: number): string {
  return count === 1 ? '1 match' : `${count} matches`;
}

function fieldsLabel(count: number): string {
  return count === 1 ? '1 field' : `${count} fields`;
}

export function FindReplaceDialog({ onClose }: { onClose(): void }): JSX.Element {
  const project = useStore((state) => state.project);
  const isReadOnly = useStore((state) => state.editor.isReadOnly);
  const [query, setQuery] = useState('');
  const [replacement, setReplacement] = useState('');
  const [isCaseSensitive, setIsCaseSensitive] = useState(false);
  const [isWholeWord, setIsWholeWord] = useState(false);
  const [deselectedIds, setDeselectedIds] = useState<ReadonlySet<string>>(new Set());
  const searchedQuery = useDeferredValue(query);
  const options: SearchOptions = useMemo(
    () => ({ isCaseSensitive, isWholeWord }),
    [isCaseSensitive, isWholeWord],
  );
  const matches = useMemo(
    () => findMatches(project, searchedQuery, options),
    [project, searchedQuery, options],
  );
  const selected = matches.filter((match) => !deselectedIds.has(match.id));
  const groups = groupMatches(project, matches);
  const hasQuery = searchedQuery.trim() !== '';

  function toggle(match: FindMatch, isSelected: boolean): void {
    const next = new Set(deselectedIds);
    if (isSelected) {
      next.delete(match.id);
    } else {
      next.add(match.id);
    }
    setDeselectedIds(next);
  }

  function replace(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (selected.length === 0) return;
    const edits = planReplacement(project, selected, searchedQuery, replacement, options);
    if (edits.length === 0) return;
    dispatch(textReplaced(edits));
    const message = `Replaced ${matchesLabel(replacementCount(selected))} in ${fieldsLabel(edits.length)}.`;
    dispatch(noticeShown('info', message));
    setDeselectedIds(new Set());
  }

  return (
    <Dialog labelId={TITLE_ID} size="wide" onClose={onClose}>
      <DialogBody titleId={TITLE_ID} title="Find and replace" onSubmit={replace}>
        <div className="ve-find-fields">
          <Field id={FIND_ID} label="Find">
            <TextInput
              id={FIND_ID}
              type="search"
              value={query}
              autoFocus
              onChange={(event) => setQuery(event.currentTarget.value)}
            />
          </Field>
          {!isReadOnly && (
            <Field id={REPLACE_ID} label="Replace with">
              <TextInput
                id={REPLACE_ID}
                value={replacement}
                onChange={(event) => setReplacement(event.currentTarget.value)}
              />
            </Field>
          )}
        </div>
        <div className="ve-find-options">
          <Checkbox
            label="Match case"
            checked={isCaseSensitive}
            onChange={(event) => setIsCaseSensitive(event.currentTarget.checked)}
          />
          <Checkbox
            label="Whole words"
            checked={isWholeWord}
            onChange={(event) => setIsWholeWord(event.currentTarget.checked)}
          />
        </div>
        {hasQuery && matches.length === 0 && (
          <p className="ui-muted" role="status">
            No matches for “{searchedQuery.trim()}”.
          </p>
        )}
        {matches.length > 0 && (
          <p className="ui-muted" role="status">
            {matchesLabel(replacementCount(matches))} in {fieldsLabel(matches.length)}
          </p>
        )}
        {groups.length > 0 && (
          <div className="ve-find-results">
            {groups.map((group) => (
              <Section key={group.id} title={group.title}>
                <ul className="ve-find-list">
                  {group.matches.map((match) => (
                    <MatchRow
                      key={match.id}
                      project={project}
                      match={match}
                      isSelected={!deselectedIds.has(match.id)}
                      canReplace={!isReadOnly}
                      onToggle={(isSelected) => toggle(match, isSelected)}
                    />
                  ))}
                </ul>
              </Section>
            ))}
          </div>
        )}
        <DialogActions>
          <Button onClick={(event) => closeDialogOf(event.currentTarget)}>Close</Button>
          {!isReadOnly && (
            <Button type="submit" variant="primary" icon="replace" disabled={selected.length === 0}>
              Replace {matchesLabel(replacementCount(selected))}
            </Button>
          )}
        </DialogActions>
      </DialogBody>
    </Dialog>
  );
}
