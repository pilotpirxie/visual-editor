import { createBlankProject } from '../../../src/app/projectFactory';
import { BUILTIN_PRESETS, CLEAN_PRESET } from '../../../src/presets/presets';
import type { Project } from '../../../src/app/types';
import { createBlock, registry } from '../../../src/components/registry';
import { EDITOR_CSS } from '../../../src/features/canvas/CanvasFrame';
import { ensureIconSets, iconSetsUsedBy } from '../../../src/features/icons/ensureIconSets';
import { renderStandalonePage } from '../../../src/render/exportSite';

export type ThumbnailHarness = {
  ids(): string[];
  render(id: string, presetId?: string): Promise<string>;
};

declare global {
  interface Window {
    thumbnailHarness?: ThumbnailHarness;
  }
}

const THUMBNAIL_CSS =
  'body { min-height: 100vh; display: flex; flex-direction: column; justify-content: center; }';

function projectWith(componentId: string, presetId: string): Project {
  const component = registry.get(componentId);
  if (component === undefined) throw new Error(`Unknown component ${componentId}`);
  const preset = BUILTIN_PRESETS.find((candidate) => candidate.id === presetId) ?? CLEAN_PRESET;
  const project = createBlankProject('Fieldnote', preset);
  const block = createBlock(component.definition);
  const homeId = project.pages.homePageId;
  const home = project.pages.entities[homeId];
  if (home === undefined) throw new Error('The blank project has no home page');
  project.blocks = { ids: [block.id], entities: { [block.id]: block } };
  project.pages.entities[homeId] = { ...home, blockIds: [block.id] };
  return project;
}

async function render(componentId: string, presetId = CLEAN_PRESET.id): Promise<string> {
  const project = projectWith(componentId, presetId);
  await ensureIconSets(iconSetsUsedBy(Object.values(project.blocks.entities), project));
  const html = renderStandalonePage(project, project.pages.homePageId, registry, {
    shouldLinkFonts: true,
  });
  return html
    .replace('<html ', '<html data-ve-editing ')
    .replace('</head>', `<style>${EDITOR_CSS}\n${THUMBNAIL_CSS}</style></head>`);
}

window.thumbnailHarness = {
  ids: () => [...registry.keys()].sort(),
  render,
};
