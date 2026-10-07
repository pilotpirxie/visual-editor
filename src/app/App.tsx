import { useEffect, useEffectEvent, useState, type JSX } from 'react';
import { EditorShell } from '../features/editor/EditorShell';
import { Notices } from '../features/editor/Notices';
import { showStoredLink } from '../features/files/fileActions';
import { FileDialogs } from '../features/files/FileDialogs';
import { PackDialogs } from '../features/block-packs/PackDialogs';
import { describeError } from './errors';
import { HomeScreen } from '../features/home/HomeScreen';
import { loadPackLibrary, syncProjectWithLibrary } from '../features/block-packs/packLibrary';
import { getProject } from '../persistence/db';
import {
  acquireProjectLock,
  waitForProjectLock,
  type ProjectLock,
} from '../persistence/projectLocks';
import { noticeShown, pageOpened, readOnlyChanged } from './editorSlice';
import { projectRefreshed } from './history';
import { projectLoaded } from './projectSlice';
import { loadProjectAssets } from './projectAssets';
import { useTabSync } from './tabSync';
import { Button } from '../../packages/ui/src';
import { loadSavedBlocks } from '../features/saved-blocks/savedBlockActions';
import { subscribeTabMessages } from '../persistence/tabChannel';
import { editorPath, followLink, HOME_PATH, navigate, useRoute } from './router';
import { autosave, dispatch, selectCurrentPage, useStore } from './store';
import type { Project } from './types';

type OpenState =
  | { status: 'ready'; projectId: string }
  | { status: 'missing'; projectId: string }
  | { status: 'failed'; projectId: string; message: string };

type NoticeProps = { title: string; text: string; onRetry?(): void };

function Notice({ title, text, onRetry }: NoticeProps): JSX.Element {
  return (
    <main className="ve-notice">
      <h1>{title}</h1>
      <p>{text}</p>
      <div className="ve-notice-actions">
        {onRetry !== undefined && (
          <Button variant="primary" onClick={onRetry}>
            Try again
          </Button>
        )}
        <a href={HOME_PATH} onClick={followLink}>
          Back to my projects
        </a>
      </div>
    </main>
  );
}

function useRoutedPage(projectId: string, routePageId: string | null, isReady: boolean): void {
  const loadedProjectId = useStore((state) => state.project.id);
  const shownPageId = useStore((state) => selectCurrentPage(state).id);
  const hasRoutePage = useStore(
    (state) => routePageId !== null && state.project.pages.entities[routePageId] !== undefined,
  );
  const isSynced = isReady && loadedProjectId === projectId;

  useEffect(() => {
    if (!isSynced || routePageId === shownPageId) return;
    if (routePageId !== null && hasRoutePage) {
      dispatch(pageOpened({ pageId: routePageId, fromPageId: shownPageId }));
      return;
    }
    navigate(editorPath(projectId, shownPageId), { replace: true });
  }, [isSynced, projectId, routePageId, hasRoutePage, shownPageId]);
}

function syncWithLibrary(): void {
  dispatch(syncProjectWithLibrary()).catch((error: unknown) => {
    console.warn('Could not compare the project with your block packs', error);
  });
}

function startEditing(projectId: string): void {
  syncWithLibrary();
  showStoredLink(projectId).catch((error: unknown) => {
    console.warn(`Could not read the file linked to project ${projectId}`, error);
  });
}

async function releaseAfterSaving(heldLock: () => ProjectLock | null): Promise<void> {
  try {
    await autosave.flush();
  } finally {
    heldLock()?.release();
  }
}

function ProjectEditor({
  projectId,
  pageId,
}: {
  projectId: string;
  pageId: string | null;
}): JSX.Element {
  const [openState, setOpenState] = useState<OpenState | null>(null);
  const [attempt, setAttempt] = useState(0);
  useRoutedPage(
    projectId,
    pageId,
    openState?.status === 'ready' && openState.projectId === projectId,
  );

  useTabSync(projectId);

  const showProject = useEffectEvent((project: Project, isReadOnly: boolean) => {
    const hasPage = pageId !== null && project.pages.entities[pageId] !== undefined;
    const openPageId = hasPage ? pageId : project.pages.homePageId;
    dispatch(projectLoaded({ project, pageId: openPageId }));
    void dispatch(loadProjectAssets());
    if (openPageId !== pageId) navigate(editorPath(project.id, openPageId), { replace: true });
    setOpenState({ status: 'ready', projectId: project.id });
    if (isReadOnly) {
      dispatch(readOnlyChanged(true));
      return;
    }
    startEditing(project.id);
  });

  useEffect(() => {
    let isCancelled = false;
    let heldLock: ProjectLock | null = null;
    const waiting = new AbortController();

    async function editWhenFree(): Promise<void> {
      try {
        heldLock = await waitForProjectLock(projectId, waiting.signal);
        const project = await getProject(projectId);
        if (isCancelled || project === null) return;
        dispatch(projectRefreshed(project));
        void dispatch(loadProjectAssets());
        dispatch(readOnlyChanged(false));
        dispatch(noticeShown('info', 'You can edit this project now.'));
        startEditing(projectId);
      } catch (error) {
        if (waiting.signal.aborted) return;
        console.error(`Could not take over editing project ${projectId}`, error);
      }
    }

    async function open(): Promise<void> {
      let project: Project | null;
      let lock: ProjectLock | null;
      try {
        await autosave.flush();
        lock = await acquireProjectLock(projectId);
        project = await getProject(projectId);
      } catch (error) {
        console.error(`Could not open project ${projectId}`, error);
        if (isCancelled) return;
        setOpenState({ status: 'failed', projectId, message: describeError(error) });
        return;
      }
      if (isCancelled || project === null) {
        lock?.release();
        if (!isCancelled) setOpenState({ status: 'missing', projectId });
        return;
      }
      heldLock = lock;
      showProject(project, lock === null);
      if (lock === null) void editWhenFree();
    }

    void open();
    return () => {
      isCancelled = true;
      waiting.abort();
      void releaseAfterSaving(() => heldLock);
    };
  }, [projectId, attempt]);

  if (openState === null || openState.projectId !== projectId) {
    return (
      <p className="ve-loading" role="status">
        Opening project…
      </p>
    );
  } else if (openState.status === 'missing') {
    return (
      <Notice
        title="Project not found"
        text="It may have been deleted, or it was saved in another browser."
      />
    );
  } else if (openState.status === 'failed') {
    return (
      <Notice
        title="Couldn’t open this project"
        text={openState.message}
        onRetry={() => {
          setOpenState(null);
          setAttempt((current) => current + 1);
        }}
      />
    );
  } else {
    return <EditorShell />;
  }
}

function RoutedScreen(): JSX.Element {
  const route = useRoute();
  if (route.name === 'home') {
    return <HomeScreen />;
  } else if (route.name === 'not-found') {
    return <Notice title="Page not found" text="There is nothing at this address." />;
  } else {
    return <ProjectEditor projectId={route.projectId} pageId={route.pageId} />;
  }
}

function refreshSavedBlocks(): void {
  dispatch(loadSavedBlocks()).catch((error: unknown) => {
    console.warn('Could not read the saved blocks in this browser', error);
  });
}

function refreshLibrary(): void {
  dispatch(loadPackLibrary()).catch((error: unknown) => {
    console.warn('Could not read the block packs in this browser', error);
  });
  refreshSavedBlocks();
}

function useBlockLibrary(): void {
  useEffect(() => {
    refreshLibrary();
    window.addEventListener('focus', refreshLibrary);
    const unsubscribe = subscribeTabMessages((message) => {
      if (message.kind === 'saved-blocks-changed') refreshSavedBlocks();
    });
    return () => {
      window.removeEventListener('focus', refreshLibrary);
      unsubscribe();
    };
  }, []);
}

export function App(): JSX.Element {
  useBlockLibrary();
  return (
    <>
      <RoutedScreen />
      <FileDialogs />
      <PackDialogs />
      <Notices />
    </>
  );
}
