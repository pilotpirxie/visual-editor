import { useMemo, type JSX } from 'react';
import { useAppSettings } from '../../app/appSettings';
import { dialogClosed, dialogOpened, libraryOpened } from '../../app/editorSlice';
import { dispatch, selectComponents, useStore } from '../../app/store';
import { launchChecks, type LaunchCheck } from './launchChecks';
import { Button, closeDialogOf, Dialog, Icon } from '../../../packages/ui/src';
import './launch.css';

const TITLE_ID = 've-launch-title';

function fix(check: LaunchCheck): void {
  if (check.fix === 'export') {
    dispatch(dialogOpened({ kind: 'export' }));
  } else {
    dispatch(dialogClosed());
    dispatch(libraryOpened(check.fix));
  }
}

export function LaunchChecklist({ onClose }: { onClose(): void }): JSX.Element {
  const project = useStore((state) => state.project);
  const components = useStore(selectComponents);
  const { publishedSites, githubSites } = useAppSettings();
  const isPublished =
    publishedSites[project.id] !== undefined || githubSites[project.id] !== undefined;
  const checks = useMemo(
    () => launchChecks(project, components, isPublished),
    [project, components, isPublished],
  );
  const doneCount = checks.filter((check) => check.isDone).length;

  return (
    <Dialog labelId={TITLE_ID} size="wide" onClose={onClose}>
      <div className="ui-dialog-body">
        <h2 id={TITLE_ID} className="ui-title">
          Launch checklist
        </h2>
        <p role="status">
          {doneCount} of {checks.length} done
        </p>
        <ul className="ve-launch-list">
          {checks.map((check) => (
            <li key={check.id} className="ve-launch-item" data-done={check.isDone || undefined}>
              <span className="ve-launch-mark" aria-hidden="true">
                {check.isDone && <Icon name="check" />}
              </span>
              <div className="ve-launch-text">
                <p id={`ve-launch-${check.id}`}>
                  <span className="ve-visually-hidden">{check.isDone ? 'Done: ' : 'To do: '}</span>
                  {check.label}
                </p>
                {!check.isDone && <p className="ui-muted">{check.advice}</p>}
              </div>
              {!check.isDone && (
                <Button aria-describedby={`ve-launch-${check.id}`} onClick={() => fix(check)}>
                  Fix
                </Button>
              )}
            </li>
          ))}
        </ul>
        <div className="ui-dialog-actions">
          <Button variant="primary" onClick={(event) => closeDialogOf(event.currentTarget)}>
            Close
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
