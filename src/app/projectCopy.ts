import { mapFieldValues } from '../components/fieldValues';
import { isButtonValue, isLinkValue } from '../components/fields';
import { definitionOf } from '../components/registry';
import type { LinkValue } from '../components/types';
import type { Asset, Block, Page, Project } from './types';

type IdMap = Map<string, string>;

function newIdsFor(ids: readonly string[]): IdMap {
  const idMap: IdMap = new Map();
  for (const id of ids) idMap.set(id, crypto.randomUUID());
  return idMap;
}

function mapped(idMap: IdMap, id: string): string {
  const newId = idMap.get(id);
  if (newId === undefined) throw new Error(`Copying a project found an unknown id ${id}`);
  return newId;
}

function mappedOptional(idMap: IdMap, id: string | undefined): string | undefined {
  return id === undefined ? undefined : mapped(idMap, id);
}

function mappedList(idMap: IdMap, ids: readonly string[]): string[] {
  const result: string[] = [];
  for (const id of ids) result.push(mapped(idMap, id));
  return result;
}

function remappedLink(link: LinkValue, pageIds: IdMap): LinkValue {
  if (link.pageId === undefined) return link;
  const pageId = pageIds.get(link.pageId);
  if (pageId === undefined) return link;
  return { ...link, pageId };
}

function copyBlock(block: Block, project: Project, blockIds: IdMap, pageIds: IdMap): Block {
  const copy = structuredClone(block);
  copy.id = mapped(blockIds, block.id);
  if (copy.kind !== 'component') return copy;
  const definition = definitionOf(project, copy.componentId);
  if (definition === undefined) return copy;
  copy.values = mapFieldValues(definition.fields, copy.values, (field, value) => {
    if (field.type === 'link' && isLinkValue(value)) return remappedLink(value, pageIds);
    if (field.type === 'button' && isButtonValue(value)) {
      return { ...value, link: remappedLink(value.link, pageIds) };
    }
    return value;
  });
  return copy;
}

function copyPage(page: Page, ids: { pages: IdMap; blocks: IdMap; assets: IdMap }): Page {
  const copy = structuredClone(page);
  copy.id = mapped(ids.pages, page.id);
  copy.blockIds = mappedList(ids.blocks, page.blockIds);
  const imageId = mappedOptional(ids.assets, page.seo.socialImageAssetId);
  if (imageId !== undefined) copy.seo.socialImageAssetId = imageId;
  return copy;
}

export function copyProjectWithNewIds(project: Project, title: string): Project {
  const ids = {
    pages: newIdsFor(project.pages.ids),
    blocks: newIdsFor(project.blocks.ids),
    assets: newIdsFor(Object.keys(project.assets)),
  };
  const pageEntities: Record<string, Page> = {};
  for (const page of Object.values(project.pages.entities)) {
    const copy = copyPage(page, ids);
    pageEntities[copy.id] = copy;
  }
  const blockEntities: Record<string, Block> = {};
  for (const block of Object.values(project.blocks.entities)) {
    const copy = copyBlock(block, project, ids.blocks, ids.pages);
    blockEntities[copy.id] = copy;
  }
  const assets: Record<string, Asset> = {};
  for (const asset of Object.values(project.assets)) {
    const id = mapped(ids.assets, asset.id);
    assets[id] = { ...asset, id };
  }
  const settings = { ...project.settings, title };
  const faviconAssetId = mappedOptional(ids.assets, settings.faviconAssetId);
  if (faviconAssetId !== undefined) settings.faviconAssetId = faviconAssetId;
  const socialImageAssetId = mappedOptional(ids.assets, settings.socialImageAssetId);
  if (socialImageAssetId !== undefined) settings.socialImageAssetId = socialImageAssetId;
  return {
    ...structuredClone(project),
    id: crypto.randomUUID(),
    settings,
    pages: {
      ids: mappedList(ids.pages, project.pages.ids),
      entities: pageEntities,
      homePageId: mapped(ids.pages, project.pages.homePageId),
    },
    blocks: { ids: mappedList(ids.blocks, project.blocks.ids), entities: blockEntities },
    sharedSlots: {
      header: mappedList(ids.blocks, project.sharedSlots.header),
      footer: mappedList(ids.blocks, project.sharedSlots.footer),
    },
    assets,
  };
}
