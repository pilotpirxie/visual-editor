import { useEffect, useEffectEvent, useState, type JSX } from 'react';
import { EditorShell } from '../features/editor/EditorShell';
import { HomeScreen } from '../features/home/HomeScreen';
import { loadIconSet } from '../features/icons/loadIconSet';
import { getProject } from '../persistence/db';
import { DEFAULT_ICON_SET } from '../render/icons';
import { projectLoaded } from './projectSlice';
import { editorPath, followLink, HOME_PATH, navigate, useRoute } from './router';
import { autosave, dispatch } from './store';
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

function ProjectEditor({
  projectId,
  pageId,
}: {
  projectId: string;
  pageId: string | null;
}): JSX.Element {
  const [openState, setOpenState] = useState<OpenState | null>(null);

  const showProject = useEffectEvent((project: Project) => {
    const hasPage = pageId !== null && project.pages.entities[pageId] !== undefined;
    const openPageId = hasPage ? pageId : project.pages.homePageId;
    dispatch(projectLoaded({ project, pageId: openPageId }));
    if (openPageId !== pageId) navigate(editorPath(project.id, openPageId), { replace: true });
    setOpenState({ status: 'ready', projectId: project.id });
  });

  useEffect(() => {
    let isCancelled = false;

    async function open(): Promise<void> {
      let project: Project | null;
      try {
        await autosave.flush();
        const [storedProject] = await Promise.all([
          getProject(projectId),
          loadIconSet(DEFAULT_ICON_SET),
        ]);
        project = storedProject;
      } catch (error) {
        console.error(`Could not open project ${projectId}`, error);
        const message = error instanceof Error ? error.message : String(error);
        if (!isCancelled) setOpenState({ status: 'failed', projectId, message });
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
  }
  if (openState.status === 'missing') {
    return (
      <Notice
        title="Project not found"
        text="It may have been deleted, or it was saved in another browser."
      />
    );
  }
  if (openState.status === 'failed') {
    return <Notice title="Couldn't open this project" text={openState.message} />;
  }
  return <EditorShell />;
}

export function App(): JSX.Element {
  const route = useRoute();
  if (route.name === 'home') return <HomeScreen />;
  if (route.name === 'not-found') {
    return <Notice title="Page not found" text="There is nothing at this address." />;
  }
  return <ProjectEditor projectId={route.projectId} pageId={route.pageId} />;
}
