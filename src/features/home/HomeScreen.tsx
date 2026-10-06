import { useEffect, useRef, useState, type JSX, type KeyboardEvent } from 'react';
import { describeError } from '../../app/errors';
import { createBlankProject, UNTITLED_PROJECT_TITLE } from '../../app/projectFactory';
import { editorPath, followLink, navigate, projectPath } from '../../app/router';
import { autosave } from '../../app/store';
import type { Project } from '../../app/types';
import {
  deleteProject,
  getProject,
  listProjects,
  putProject,
  type ProjectSummary,
} from '../../persistence/db';
import { Icon } from '../editor/Icon';
import { duplicateProject, formatLastEdit, withTitle } from './projects';
import './home.css';

async function requireProject(id: string): Promise<Project> {
  const project = await getProject(id);
  if (project === null) throw new Error('This project no longer exists');
  return project;
}

type ProjectList = { summaries: ProjectSummary[]; listedAt: number };

type RenameExit = 'keyboard' | 'blur';

async function loadProjectList(): Promise<ProjectList> {
  await autosave.flush();
  const summaries = await listProjects();
  return { summaries, listedAt: Date.now() };
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
    <input
      className="ve-input ve-home-rename"
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
  const renameButtonsRef = useRef(new Map<string, HTMLButtonElement>());

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
    return () => {
      isCancelled = true;
    };
  }, []);

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

  async function createProject(): Promise<void> {
    const project = createBlankProject(UNTITLED_PROJECT_TITLE);
    try {
      await putProject(project);
    } catch (createError) {
      console.error('Could not create a project', createError);
      setError(`Could not create a project: ${describeError(createError)}`);
      return;
    }
    navigate(editorPath(project.id, project.pages.homePageId));
  }

  function finishRename(summary: ProjectSummary, title: string | null, exit: RenameExit): void {
    setRenamingId(null);
    if (exit === 'keyboard') renameButtonsRef.current.get(summary.id)?.focus();
    const trimmed = title?.trim() ?? '';
    if (trimmed === '' || trimmed === summary.title) return;
    void runProjectAction('rename the project', async () => {
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

  function remove(summary: ProjectSummary): void {
    const isConfirmed = window.confirm(`Delete “${summary.title}”? This cannot be undone.`);
    if (!isConfirmed) return;
    void runProjectAction('delete the project', () => deleteProject(summary.id));
  }

  return (
    <main className="ve-home">
      <header className="ve-home-header">
        <h1>My projects</h1>
        <button type="button" className="ve-button ve-button--primary" onClick={createProject}>
          <Icon name="plus" />
          New project
        </button>
      </header>

      {error !== null && (
        <p className="ve-home-error" role="alert">
          {error}
        </p>
      )}
      {projectList === null && error === null && <p className="ve-muted">Loading your projects…</p>}
      {projectList !== null && projectList.summaries.length === 0 && (
        <p className="ve-home-empty">
          You have no projects yet. Create one to start building a site.
        </p>
      )}

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
              <p className="ve-muted">
                Edited {formatLastEdit(summary.updatedAt, projectList.listedAt)}
              </p>
              <div className="ve-home-card-actions">
                <button
                  ref={(button) => {
                    if (button === null) return;
                    renameButtonsRef.current.set(summary.id, button);
                    return () => {
                      renameButtonsRef.current.delete(summary.id);
                    };
                  }}
                  type="button"
                  className="ve-icon-button"
                  aria-label={`Rename ${summary.title}`}
                  title="Rename"
                  onClick={() => setRenamingId(summary.id)}
                >
                  <Icon name="pencil" />
                </button>
                <button
                  type="button"
                  className="ve-icon-button"
                  aria-label={`Duplicate ${summary.title}`}
                  title="Duplicate"
                  onClick={() => duplicate(summary)}
                >
                  <Icon name="copy" />
                </button>
                <button
                  type="button"
                  className="ve-icon-button"
                  aria-label={`Delete ${summary.title}`}
                  title="Delete"
                  onClick={() => remove(summary)}
                >
                  <Icon name="trash" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
