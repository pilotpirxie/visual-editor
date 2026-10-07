import { useEffect, useEffectEvent, useState, type JSX } from 'react';
import { EditorShell } from '../features/editor/EditorShell';
import { Notices } from '../features/editor/Notices';
import { showStoredLink } from '../features/files/fileActions';
import { FileDialogs } from '../features/files/FileDialogs';
import { describeError } from './errors';
import { HomeScreen } from '../features/home/HomeScreen';
import { ensureProjectIconSets } from '../features/icons/ensureIconSets';
import { getProject } from '../persistence/db';
import { pageOpened } from './editorSlice';
import { projectLoaded } from './projectSlice';
import { editorPath, followLink, HOME_PATH, navigate, useRoute } from './router';
import { autosave, dispatch, selectCurrentPage, useStore } from './store';
import type { Project } from './types';

type OpenState =
  | { status: 'ready'; projectId: string }
  | { status: 'missing'; projectId: string }
  | { status: 'failed'; projectId: string; message: string };

function Notice({ title, text }: { title: string; text: string }): JSX.Element {
  return (
    <main className="ve-notice">
      <h1>{title}</h1>
      <p>{text}</p>
      <a href={HOME_PATH} onClick={followLink}>
        Back to my projects
      </a>
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

function ProjectEditor({
  projectId,
  pageId,
}: {
  projectId: string;
  pageId: string | null;
}): JSX.Element {
  const [openState, setOpenState] = useState<OpenState | null>(null);
  useRoutedPage(
    projectId,
    pageId,
    openState?.status === 'ready' && openState.projectId === projectId,
  );

  const showProject = useEffectEvent((project: Project) => {
    const hasPage = pageId !== null && project.pages.entities[pageId] !== undefined;
    const openPageId = hasPage ? pageId : project.pages.homePageId;
    dispatch(projectLoaded({ project, pageId: openPageId }));
    if (openPageId !== pageId) navigate(editorPath(project.id, openPageId), { replace: true });
    setOpenState({ status: 'ready', projectId: project.id });
    showStoredLink(project.id).catch((error: unknown) => {
      console.warn(`Could not read the file linked to project ${project.id}`, error);
    });
  });

  useEffect(() => {
    let isCancelled = false;

    async function open(): Promise<void> {
      let project: Project | null;
      try {
        await autosave.flush();
        project = await getProject(projectId);
        if (project !== null) await ensureProjectIconSets(project);
      } catch (error) {
        console.error(`Could not open project ${projectId}`, error);
        if (isCancelled) return;
        setOpenState({ status: 'failed', projectId, message: describeError(error) });
        return;
      }
      if (isCancelled) return;
      if (project === null) {
        setOpenState({ status: 'missing', projectId });
        return;
      }
      showProject(project);
    }

    void open();
    return () => {
      isCancelled = true;
      void autosave.flush();
    };
  }, [projectId]);

  if (openState === null || openState.projectId !== projectId) {
    return <p className="ve-loading">Opening project…</p>;
  } else if (openState.status === 'missing') {
    return (
      <Notice
        title="Project not found"
        text="It may have been deleted, or it was saved in another browser."
      />
    );
  } else if (openState.status === 'failed') {
    return <Notice title="Couldn't open this project" text={openState.message} />;
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

export function App(): JSX.Element {
  return (
    <>
      <RoutedScreen />
      <FileDialogs />
      <Notices />
    </>
  );
}
