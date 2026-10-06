import { useEffect, useRef, useState, type JSX, type KeyboardEvent } from 'react';
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

async function loadProjectList(): Promise<ProjectList> {
  await autosave.flush();
  const summaries = await listProjects();
  return { summaries, listedAt: Date.now() };
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function RenameInput({
  summary,
  onDone,
}: {
  summary: ProjectSummary;
  onDone(title: string | null): void;
}): JSX.Element {
  const isDoneRef = useRef(false);

  function finish(title: string | null): void {
    if (isDoneRef.current) return;
    isDoneRef.current = true;
    onDone(title);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>): void {
    if (event.key === 'Enter') finish(event.currentTarget.value);
    if (event.key === 'Escape') finish(null);
  }

  return (
    <input
      className="ve-input ve-home-rename"
      aria-label="Project name"
      defaultValue={summary.title}
      autoFocus
      onKeyDown={onKeyDown}
      onBlur={(event) => finish(event.currentTarget.value)}
    />
  );
}

export function HomeScreen(): JSX.Element {
  const [projectList, setProjectList] = useState<ProjectList | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;
    async function load(): Promise<void> {
      try {
        const list = await loadProjectList();
        if (!isCancelled) setProjectList(list);
      } catch (loadError) {
        console.error('Could not list projects', loadError);
        if (!isCancelled) setError(errorMessage(loadError));
      }
    }
    void load();
    return () => {
      isCancelled = true;
    };
  }, []);

  async function run(description: string, action: () => Promise<void>): Promise<void> {
    setError(null);
    try {
      await action();
      setProjectList(await loadProjectList());
    } catch (actionError) {
      console.error(`Could not ${description}`, actionError);
      setError(`Could not ${description}: ${errorMessage(actionError)}`);
    }
  }

  async function createProject(): Promise<void> {
    const project = createBlankProject(UNTITLED_PROJECT_TITLE);
    try {
      await putProject(project);
    } catch (createError) {
      console.error('Could not create a project', createError);
      setError(`Could not create a project: ${errorMessage(createError)}`);
      return;
    }
    navigate(editorPath(project.id, project.pages.homePageId));
  }

  function finishRename(summary: ProjectSummary, title: string | null): void {
    setRenamingId(null);
    const trimmed = title?.trim() ?? '';
    if (trimmed === '' || trimmed === summary.title) return;
    void run('rename the project', async () => {
      await putProject(withTitle(await requireProject(summary.id), trimmed));
    });
  }

  function duplicate(summary: ProjectSummary): void {
    void run('duplicate the project', async () => {
      await putProject(duplicateProject(await requireProject(summary.id), crypto.randomUUID()));
    });
  }

  function remove(summary: ProjectSummary): void {
    if (!window.confirm(`Delete “${summary.title}”? This cannot be undone.`)) return;
    void run('delete the project', () => deleteProject(summary.id));
  }

  const projects = projectList?.summaries ?? null;

  return (
    <main className="ve-home">
      <header className="ve-home-header">
        <h1>My projects</h1>
        <button type="button" className="ve-button ve-button--primary" onClick={createProject}>
          <Icon name="plus" />
          New project
        </button>
      </header>

      {error && (
        <p className="ve-home-error" role="alert">
          {error}
        </p>
      )}
      {projects === null && !error && <p className="ve-muted">Loading your projects…</p>}
      {projects?.length === 0 && (
        <p className="ve-home-empty">
          You have no projects yet. Create one to start building a site.
        </p>
      )}

      {projects && projects.length > 0 && (
        <ul className="ve-home-grid" aria-label="Projects">
          {projects.map((summary) => (
            <li key={summary.id} className="ve-home-card">
              {renamingId === summary.id ? (
                <RenameInput summary={summary} onDone={(title) => finishRename(summary, title)} />
              ) : (
                <h2 className="ve-home-card-title">
                  <a href={projectPath(summary.id)} onClick={followLink}>
                    {summary.title}
                  </a>
                </h2>
              )}
              <p className="ve-muted">
                Edited {formatLastEdit(summary.updatedAt, projectList?.listedAt ?? 0)}
              </p>
              <div className="ve-home-card-actions">
                <button
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
