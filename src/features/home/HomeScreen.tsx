import { Suspense, useEffect, useRef, useState, type JSX, type KeyboardEvent } from 'react';
import { describeError } from '../../app/errors';
import { followLink, projectPath } from '../../app/router';
import { autosave } from '../../app/store';
import type { Project } from '../../app/types';
import {
  deleteProject,
  getProject,
  listFileLinks,
  listProjects,
  putProject,
  type FileLink,
  type ProjectSummary,
} from '../../persistence/db';
import { isProjectOpenElsewhere } from '../../persistence/projectLocks';
import { subscribeTabMessages } from '../../persistence/tabChannel';
import { canUseFileSystemAccess } from '../files/fileAccess';
import { fileCommands } from '../files/fileCommands';
import { LicensesDialog, NewProjectDialog } from '../../app/lazyDialogs';
import { duplicateProject, formatLastEdit, withTitle } from './projects';
import './home.css';
import { Button, IconButton, TextInput, Title } from '../../../packages/ui/src';

async function requireProject(id: string): Promise<Project> {
  const project = await getProject(id);
  if (project === null) throw new Error('This project no longer exists');
  return project;
}

type ProjectList = { summaries: ProjectSummary[]; recentFiles: FileLink[]; listedAt: number };

type RenameExit = 'keyboard' | 'blur';

async function loadProjectList(): Promise<ProjectList> {
  await autosave.flush();
  const summaries = await listProjects();
  const recentFiles = canUseFileSystemAccess() ? await listFileLinks() : [];
  return { summaries, recentFiles, listedAt: Date.now() };
}

function RecentFiles({ links }: { links: FileLink[] }): JSX.Element | null {
  if (links.length === 0) return null;
  return (
    <section className="ve-home-recent" aria-labelledby="ve-home-recent-title">
      <Title id="ve-home-recent-title">Recent files</Title>
      <ul className="ve-home-recent-list">
        {links.map((link) => (
          <li key={link.id}>
            <Button icon="file" onClick={() => fileCommands.openRecent(link)}>
              {link.name}
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function RenameInput({
  summary,
  onDone,
}: {
  summary: ProjectSummary;
  onDone(title: string | null, exit: RenameExit): void;
}): JSX.Element {
  const isDoneRef = useRef(false);

  function finish(title: string | null, exit: RenameExit): void {
    if (isDoneRef.current) return;
    isDoneRef.current = true;
    onDone(title, exit);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>): void {
    if (event.key === 'Enter') {
      finish(event.currentTarget.value, 'keyboard');
    } else if (event.key === 'Escape') {
      finish(null, 'keyboard');
    }
  }

  return (
    <TextInput
      className="ve-home-rename"
      aria-label="Project name"
      defaultValue={summary.title}
      autoFocus
      onKeyDown={onKeyDown}
      onBlur={(event) => finish(event.currentTarget.value, 'blur')}
    />
  );
}

export function HomeScreen(): JSX.Element {
  const [projectList, setProjectList] = useState<ProjectList | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [isLicensesOpen, setIsLicensesOpen] = useState(false);
  const [isNewProjectOpen, setIsNewProjectOpen] = useState(false);
  const renameButtonsRef = useRef(new Map<string, HTMLButtonElement>());
  const [listAttempt, setListAttempt] = useState(0);

  useEffect(() => {
    let isCancelled = false;
    async function load(): Promise<void> {
      try {
        const list = await loadProjectList();
        if (!isCancelled) setProjectList(list);
      } catch (loadError) {
        console.error('Could not list projects', loadError);
        if (!isCancelled) setError(describeError(loadError));
      }
    }
    void load();
    const unsubscribe = subscribeTabMessages((message) => {
      if (message.kind !== 'saved-blocks-changed') void load();
    });
    return () => {
      isCancelled = true;
      unsubscribe();
    };
  }, [listAttempt]);

  async function runProjectAction(description: string, action: () => Promise<void>): Promise<void> {
    setError(null);
    try {
      await action();
      const refreshedList = await loadProjectList();
      setProjectList(refreshedList);
    } catch (actionError) {
      console.error(`Could not ${description}`, actionError);
      setError(`Could not ${description}: ${describeError(actionError)}`);
    }
  }

  function finishRename(summary: ProjectSummary, title: string | null, exit: RenameExit): void {
    setRenamingId(null);
    if (exit === 'keyboard') renameButtonsRef.current.get(summary.id)?.focus();
    const trimmed = title?.trim() ?? '';
    if (trimmed === '' || trimmed === summary.title) return;
    void runProjectAction('rename the project', async () => {
      if (await isProjectOpenElsewhere(summary.id)) {
        throw new Error(`close “${summary.title}” in your other tab first, or rename it there`);
      }
      const project = await requireProject(summary.id);
      await putProject(withTitle(project, trimmed));
    });
  }

  function duplicate(summary: ProjectSummary): void {
    void runProjectAction('duplicate the project', async () => {
      const project = await requireProject(summary.id);
      await putProject(duplicateProject(project, crypto.randomUUID()));
    });
  }

  async function remove(summary: ProjectSummary): Promise<void> {
    const isOpenElsewhere = await isProjectOpenElsewhere(summary.id);
    const question = isOpenElsewhere
      ? `“${summary.title}” is open in another tab. Delete it anyway? That tab will close it.`
      : `Delete “${summary.title}”? This cannot be undone.`;
    if (!window.confirm(question)) return;
    await runProjectAction('delete the project', () => deleteProject(summary.id));
  }

  return (
    <main className="ve-home">
      <header className="ve-home-header">
        <h1>My projects</h1>
        <div className="ve-home-actions">
          <Button icon="folder-open" onClick={fileCommands.openFromDisk}>
            Open from disk
          </Button>
          <Button
            variant="primary"
            icon="plus"
            aria-haspopup="dialog"
            onClick={() => setIsNewProjectOpen(true)}
          >
            New project
          </Button>
        </div>
      </header>

      {error !== null && (
        <div className="ve-home-error" role="alert">
          <p>{error}</p>
          {projectList === null && (
            <Button
              onClick={() => {
                setError(null);
                setListAttempt((current) => current + 1);
              }}
            >
              Try again
            </Button>
          )}
        </div>
      )}
      {projectList === null && error === null && (
        <p className="ui-muted" role="status">
          Loading your projects…
        </p>
      )}
      {projectList !== null && projectList.summaries.length === 0 && (
        <p className="ve-home-empty">
          You have no projects yet. Create one to start building a site.
        </p>
      )}

      {projectList !== null && <RecentFiles links={projectList.recentFiles} />}

      {projectList !== null && projectList.summaries.length > 0 && (
        <ul className="ve-home-grid" aria-label="Projects">
          {projectList.summaries.map((summary) => (
            <li key={summary.id} className="ve-home-card">
              {renamingId === summary.id ? (
                <RenameInput
                  summary={summary}
                  onDone={(title, exit) => finishRename(summary, title, exit)}
                />
              ) : (
                <h2 className="ve-home-card-title">
                  <a href={projectPath(summary.id)} onClick={followLink}>
                    {summary.title}
                  </a>
                </h2>
              )}
              <p className="ui-muted">
                Edited {formatLastEdit(summary.updatedAt, projectList.listedAt)}
              </p>
              <div className="ve-home-card-actions">
                <IconButton
                  ref={(button) => {
                    if (button === null) return;
                    renameButtonsRef.current.set(summary.id, button);
                    return () => {
                      renameButtonsRef.current.delete(summary.id);
                    };
                  }}
                  label={`Rename ${summary.title}`}
                  icon="pencil"
                  onClick={() => setRenamingId(summary.id)}
                />
                <IconButton
                  label={`Duplicate ${summary.title}`}
                  icon="copy"
                  onClick={() => duplicate(summary)}
                />
                <IconButton
                  label={`Delete ${summary.title}`}
                  icon="trash"
                  onClick={() => void remove(summary)}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
      <footer className="ve-home-footer">
        <Button variant="ghost" onClick={() => setIsLicensesOpen(true)}>
          Open-source licenses
        </Button>
      </footer>
      <Suspense fallback={null}>
        {isLicensesOpen && <LicensesDialog onClose={() => setIsLicensesOpen(false)} />}
        {isNewProjectOpen && <NewProjectDialog onClose={() => setIsNewProjectOpen(false)} />}
      </Suspense>
    </main>
  );
}
