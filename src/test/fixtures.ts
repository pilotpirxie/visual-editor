import { createSampleProject } from '../app/projectFactory';
import { projectLoaded } from '../app/projectSlice';
import { createAppStore, dispatch } from '../app/store';
import type { Page, Project } from '../app/types';

export type TestStore = ReturnType<typeof createAppStore>;

export function createTestStore(project: Project = createSampleProject()): TestStore {
  const store = createAppStore();
  store.dispatch(projectLoaded({ project, pageId: project.pages.homePageId }));
  return store;
}

export function loadIntoAppStore(project: Project = createSampleProject()): Project {
  dispatch(projectLoaded({ project, pageId: project.pages.homePageId }));
  return project;
}

export function homePage(project: Project): Page {
  return project.pages.entities[project.pages.homePageId];
}
