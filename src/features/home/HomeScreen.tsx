import { Suspense, useEffect, useRef, useState, type JSX, type KeyboardEvent } from 'react';
import { describeError } from '../../app/errors';
import { editorPath, followLink, navigate, projectPath } from '../../app/router';
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
import { ensurePackBlocks } from '../../components/registry';
import { instantiateStarter, type StarterInfo } from '../../starters/starters';
import { canUseFileSystemAccess } from '../files/fileAccess';
import { fileCommands } from '../files/fileCommands';
import { ensureProjectIconSets } from '../icons/ensureIconSets';
import { LicensesDialog, NewProjectDialog } from '../../app/lazyDialogs';
import { DeleteProjectDialog } from './DeleteProjectDialog';
import { duplicateProject, formatLastEdit, withTitle } from './projects';
import { PageThumbnail, StarterGallery, useIsNearViewport } from './StarterGallery';
import './home.css';
import { Button, Icon, IconButton, TextInput, Title } from '../../../packages/ui/src';

async function requireProject(id: string): Promise<Project> {
  const project = await getProject(id);
  if (project === null) throw new Error('This project no longer exists');
  return project;
}

type ProjectList = { summaries: ProjectSummary[]; recentFiles: FileLink[]; listedAt: number };

type RenameExit = 'keyboard' | 'blur';

type PendingDelete = { summary: ProjectSummary; isOpenElsewhere: boolean };

const TITLE_ID = 've-home-title';
const STARTERS_TITLE_ID = 've-home-starters-title';

async function loadThumbnailProject(projectId: string): Promise<Project | null> {
  const project = await getProject(projectId);
  if (project === null) return null;
  await Promise.all([
    ensureProjectIconSets(project),
    ensurePackBlocks(Object.values(project.packBlocks)),
  ]);
  return project;
}

function ProjectThumbnail({ summary }: { summary: ProjectSummary }): JSX.Element {
  const [project, setProject] = useState<Project | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const isNear = useIsNearViewport(boxRef);
  const { id, updatedAt } = summary;

  useEffect(() => {
    if (!isNear) return;
    let isCancelled = false;
    async function load(): Promise<void> {
      try {
        const loaded = await loadThumbnailProject(id);
        if (!isCancelled) setProject(loaded);
      } catch (loadError) {
        console.error(`Could not load the thumbnail of project ${id}`, loadError);
      }
    }
    void load();
    return () => {
      isCancelled = true;
    };
  }, [id, updatedAt, isNear]);

  if (project === null) return <div className="ve-page-thumbnail" ref={boxRef} />;
  return <PageThumbnail project={project} />;
}

function BlankSiteCard({ onStart }: { onStart(): void }): JSX.Element {
  return (
    <>
      <div className="ve-page-thumbnail ve-blank-thumbnail">
        <Icon name="plus" />
      </div>
      <h3 className="ve-starter-name">Blank site</h3>
      <p className="ui-muted">Pick a design preset, then add blocks one by one.</p>
      <div className="ve-starter-actions">
        <Button aria-haspopup="dialog" onClick={onStart}>
          Start blank
        </Button>
      </div>
    </>
  );
}

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
  const [deleting, setDeleting] = useState<PendingDelete | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const newProjectRef = useRef<HTMLButtonElement>(null);
  const gridRef = useRef<HTMLUListElement>(null);
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

  async function startFromStarter(starter: StarterInfo, project: Project): Promise<void> {
    setError(null);
    setIsCreating(true);
    const created = instantiateStarter(starter, project, project.settings.title);
    try {
      await putProject(created);
    } catch (createError) {
      console.error('Could not create a project from a starter', createError);
      setError(`Could not create a project: ${describeError(createError)}`);
      setIsCreating(false);
      return;
    }
    navigate(editorPath(created.id, created.pages.homePageId));
  }

  async function askToRemove(summary: ProjectSummary): Promise<void> {
    const isOpenElsewhere = await isProjectOpenElsewhere(summary.id);
    setDeleting({ summary, isOpenElsewhere });
  }

  function focusCardAt(index: number): void {
    const links = gridRef.current?.querySelectorAll<HTMLElement>('.ve-home-card-title a') ?? [];
    const target = links[Math.min(index, links.length - 1)] ?? newProjectRef.current;
    target?.focus();
  }

  async function remove(summary: ProjectSummary): Promise<void> {
    const index = projectList?.summaries.indexOf(summary) ?? 0;
    await runProjectAction('delete the project', () => deleteProject(summary.id));
    requestAnimationFrame(() => focusCardAt(index));
  }

  const hasProjects = projectList !== null && projectList.summaries.length > 0;
  const isEmpty = projectList !== null && projectList.summaries.length === 0;
  return (
    <main className="ve-home">
      <header className="ve-home-header">
        <h1 id={TITLE_ID}>{isEmpty ? 'Start a new site' : 'My projects'}</h1>
        <div className="ve-home-actions">
          <Button icon="folder-open" onClick={fileCommands.openFromDisk}>
            Open from disk
          </Button>
          <Button
            ref={newProjectRef}
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
      {projectList !== null && <RecentFiles links={projectList.recentFiles} />}

      {projectList !== null && hasProjects && (
        <ul ref={gridRef} className="ve-home-grid" aria-label="Projects">
          {projectList.summaries.map((summary) => (
            <li key={summary.id} className="ve-home-card">
              <ProjectThumbnail summary={summary} />
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
                  onClick={() => void askToRemove(summary)}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
      {projectList !== null && (
        <section
          className="ve-home-starters"
          aria-labelledby={hasProjects ? STARTERS_TITLE_ID : TITLE_ID}
        >
          {hasProjects && (
            <h2 id={STARTERS_TITLE_ID} className="ve-home-section-title">
              Start a new site
            </h2>
          )}
          <StarterGallery
            isDisabled={isCreating}
            leadingCard={<BlankSiteCard onStart={() => setIsNewProjectOpen(true)} />}
            onUse={(starter, project) => void startFromStarter(starter, project)}
          />
        </section>
      )}
      <footer className="ve-home-footer">
        <button
          type="button"
          className="ve-home-footer-link"
          onClick={() => setIsLicensesOpen(true)}
        >
          Open-source licenses
        </button>
      </footer>
      <Suspense fallback={null}>
        {isLicensesOpen && <LicensesDialog onClose={() => setIsLicensesOpen(false)} />}
        {isNewProjectOpen && <NewProjectDialog onClose={() => setIsNewProjectOpen(false)} />}
      </Suspense>
      {deleting !== null && (
        <DeleteProjectDialog
          title={deleting.summary.title}
          isOpenElsewhere={deleting.isOpenElsewhere}
          onConfirm={() => void remove(deleting.summary)}
          onClose={() => setDeleting(null)}
        />
      )}
    </main>
  );
}
