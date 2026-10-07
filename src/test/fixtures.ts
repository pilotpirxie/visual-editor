import { createSampleProject } from '../app/projectFactory';
import { blockShared, projectLoaded } from '../app/projectSlice';
import { createAppStore, dispatch, store } from '../app/store';
import { FONT_ROLES, type ComponentBlock, type Page, type Project } from '../app/types';
import { SYSTEM_FONT_STACKS } from '../render/fonts';

export type TestStore = ReturnType<typeof createAppStore>;

export function withSystemFonts(project: Project): Project {
  const { tokens } = project.designSystem;
  for (const role of FONT_ROLES) {
    const token = tokens[`--font-${role}`];
    if (token !== undefined) token.value = SYSTEM_FONT_STACKS[role];
  }
  project.designSystem.fonts = [];
  return project;
}

const SOCIAL_IMAGE_ID = 'social-image';
const PNG_PIXEL =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

export function withSearchDetails(project: Project): Project {
  project.settings.description = 'Notes from customer interviews, tagged and searchable.';
  project.assets[SOCIAL_IMAGE_ID] = {
    id: SOCIAL_IMAGE_ID,
    name: 'social.png',
    mimeType: 'image/png',
    dataUrl: `data:image/png;base64,${PNG_PIXEL}`,
  };
  project.settings.socialImageAssetId = SOCIAL_IMAGE_ID;
  return project;
}

export function createTestStore(project: Project = createSampleProject()): TestStore {
  const store = createAppStore();
  store.dispatch(projectLoaded({ project, pageId: project.pages.homePageId }));
  return store;
}

export function loadIntoAppStore(project: Project = createSampleProject()): Project {
  dispatch(projectLoaded({ project, pageId: project.pages.homePageId }));
  return project;
}

export function componentBlockOf(project: Project, blockId: string): ComponentBlock {
  const block = project.blocks.entities[blockId];
  if (block?.kind !== 'component') throw new Error(`Block ${blockId} is not a component block`);
  return block;
}

export function homePage(project: Project): Page {
  return project.pages.entities[project.pages.homePageId];
}

export function shareNavAndFooter(target: TestStore = store): { navId: string; footerId: string } {
  const page = homePage(target.getState().project);
  const [navId, , , footerId] = page.blockIds;
  target.dispatch(blockShared({ blockId: navId, slot: 'header', pageId: page.id }));
  target.dispatch(blockShared({ blockId: footerId, slot: 'footer', pageId: page.id }));
  return { navId, footerId };
}
