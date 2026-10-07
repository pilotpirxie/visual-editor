import {
  createAction,
  createEntityAdapter,
  createSlice,
  current,
  type PayloadAction,
} from '@reduxjs/toolkit';
import { blockCategory, createBlock, registry } from '../components/registry';
import { iconSetInfo } from '../../packages/icon-data/src/sets';
import { isValidAnchor, isValidClassName } from '../render/attributes';
import { referencedTokenName } from '../render/css';
import { isSafeCssValue } from '../render/sanitize';
import { findBlockList, sharedSlotOf, slotForCategory } from './blockLists';
import { sectionThemeById, supportsSectionThemes, THEMED_TOKENS } from './sectionThemes';
import { createBlankProject, createPage, UNTITLED_PROJECT_TITLE } from './projectFactory';
import { FAVICON_TYPES, settingError, SOCIAL_IMAGE_TYPES, type SettingKey } from './settingsRules';
import { slugError } from './slugs';
import {
  derivedFontWeights,
  nearestWeight,
  SYSTEM_FONT_WEIGHTS,
  WEIGHT_TOKENS,
} from './typography';
import {
  DEVICES,
  FONT_ROLES,
  type Block,
  type ComponentBlock,
  type DesignSystem,
  type Device,
  type HtmlBlock,
  type Asset,
  type FontRole,
  type Page,
  type PageSeo,
  type Project,
  type SharedSlot,
  type TokenGenerators,
} from './types';

const blocksAdapter = createEntityAdapter<Block>();
const pagesAdapter = createEntityAdapter<Page>();

export type NewPage = { id: string; name: string; slug: string };

export type BlockListTarget = { kind: 'page'; pageId: string } | { kind: 'slot'; slot: SharedSlot };

export type SeoTextKey = Exclude<keyof PageSeo, 'socialImageAssetId'>;

export type ImageUpload = Omit<Asset, 'id'>;

export { FAVICON_TYPES, settingError, SOCIAL_IMAGE_TYPES, type SettingKey };

export type ProjectImageRole = 'favicon' | 'socialImage';

const PROJECT_IMAGE_TYPES: Record<ProjectImageRole, string[]> = {
  favicon: FAVICON_TYPES,
  socialImage: SOCIAL_IMAGE_TYPES,
};

const PROJECT_IMAGE_KEYS: Record<ProjectImageRole, 'faviconAssetId' | 'socialImageAssetId'> = {
  favicon: 'faviconAssetId',
  socialImage: 'socialImageAssetId',
};

const SEO_TEXT_KEYS: SeoTextKey[] = ['title', 'description', 'socialTitle', 'socialDescription'];

function isSeoTextKey(key: string): key is SeoTextKey {
  return SEO_TEXT_KEYS.some((known) => known === key);
}

function isImageUpload(upload: ImageUpload, allowedTypes: readonly string[]): boolean {
  return (
    allowedTypes.includes(upload.mimeType) &&
    upload.dataUrl.startsWith(`data:${upload.mimeType};base64,`)
  );
}

function assetFromUpload(upload: ImageUpload | null): Asset | null {
  if (upload === null) return null;
  return { ...upload, id: crypto.randomUUID() };
}

function isAssetUsed(state: Project, assetId: string): boolean {
  const { faviconAssetId, socialImageAssetId } = state.settings;
  if (faviconAssetId === assetId || socialImageAssetId === assetId) return true;
  for (const id of state.pages.ids) {
    if (state.pages.entities[id]?.seo.socialImageAssetId === assetId) return true;
  }
  return false;
}

function removeAssetIfUnused(state: Project, assetId: string | undefined): void {
  if (assetId === undefined || isAssetUsed(state, assetId)) return;
  delete state.assets[assetId];
}

export type EditKind = 'continuous' | 'discrete';

export type EditMeta = { mergeKey: string | null; at: number };

function editMeta(kind: EditKind, mergeKey: string): EditMeta {
  if (kind === 'continuous') return { mergeKey, at: Date.now() };
  return { mergeKey: null, at: Date.now() };
}

export type TokensChange = {
  values: Record<string, string>;
  generators?: Partial<TokenGenerators>;
};

const GENERATOR_KEYS: (keyof TokenGenerators)[] = ['typeBasePx', 'typeRatio', 'spaceUnitPx'];

function isGeneratorKey(key: string): key is keyof TokenGenerators {
  return GENERATOR_KEYS.some((known) => known === key);
}

export type FontChange =
  | { role: FontRole; family: string; availableWeights: number[]; stack: string }
  | { role: FontRole; family: null; stack: string };

const FONT_WEIGHT_STEP = 100;
const MAX_FONT_WEIGHT = 1000;

function isFontWeight(weight: number): boolean {
  return (
    Number.isInteger(weight) &&
    weight > 0 &&
    weight <= MAX_FONT_WEIGHT &&
    weight % FONT_WEIGHT_STEP === 0
  );
}

function isFontRole(role: string): role is FontRole {
  return FONT_ROLES.some((known) => known === role);
}

export type AdvancedChange =
  | { key: 'anchor'; value: string }
  | { key: 'extraClasses'; value: string[] }
  | { key: 'hideOn'; value: Device[] };

function isSameList<T>(left: readonly T[], right: readonly T[]): boolean {
  return left.length === right.length && left.every((item, index) => item === right[index]);
}

function syncFontWeights(designSystem: DesignSystem): void {
  for (const font of designSystem.fonts) {
    const weights = derivedFontWeights(font.role, designSystem.tokens);
    if (!isSameList(weights, font.weights)) font.weights = weights;
  }
}

function isWeightToken(name: string): boolean {
  for (const role of FONT_ROLES) {
    if (WEIGHT_TOKENS[role].includes(name)) return true;
  }
  return false;
}

function availableWeightsOf(change: FontChange): number[] {
  if (change.family === null) return [...SYSTEM_FONT_WEIGHTS];
  return change.availableWeights.filter(isFontWeight);
}

function applyAdvancedChange(block: Block, change: AdvancedChange): void {
  if (change.key === 'anchor') {
    const anchor = change.value.trim();
    if (anchor === '') {
      delete block.anchor;
    } else if (isValidAnchor(anchor) && anchor !== block.anchor) {
      block.anchor = anchor;
    }
  } else if (change.key === 'extraClasses') {
    const classes = [...new Set(change.value)];
    if (!classes.every(isValidClassName) || isSameList(classes, block.extraClasses)) return;
    block.extraClasses = classes;
  } else {
    const devices = DEVICES.filter((device) => change.value.includes(device));
    if (!isSameList(devices, block.hideOn)) block.hideOn = devices;
  }
}

export const projectLoaded = createAction<{ project: Project; pageId: string | null }>(
  'project/loaded',
);

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function slugsExcept(state: Project, pageId: string | null): string[] {
  const slugs: string[] = [];
  for (const id of state.pages.ids) {
    const page = state.pages.entities[id];
    if (page !== undefined && id !== pageId) slugs.push(page.slug);
  }
  return slugs;
}

function isValidNewPage(state: Project, page: NewPage): boolean {
  if (state.pages.entities[page.id] !== undefined || page.name.trim() === '') return false;
  return slugError(page.slug, slugsExcept(state, null)) === null;
}

function targetList(state: Project, target: BlockListTarget, block: Block): string[] | null {
  if (target.kind === 'page') return state.pages.entities[target.pageId]?.blockIds ?? null;
  const category = blockCategory(block);
  if (category === null || slotForCategory(category) !== target.slot) return null;
  return state.sharedSlots[target.slot];
}

function isOverridable(block: ComponentBlock, token: string): boolean {
  const component = registry.get(block.componentId);
  if (component === undefined) return false;
  return component.definition.styleOverrides.includes(token);
}

function createsOverrideCycle(
  overrides: Record<string, string>,
  token: string,
  value: string,
): boolean {
  const seen = new Set([token]);
  let next = referencedTokenName(value);
  while (next !== null && overrides[next] !== undefined) {
    if (seen.has(next)) return true;
    seen.add(next);
    next = referencedTokenName(overrides[next]);
  }
  return next !== null && seen.has(next);
}

export const projectSlice = createSlice({
  name: 'project',
  initialState: () => createBlankProject(UNTITLED_PROJECT_TITLE),
  reducers: {
    blockInserted: {
      reducer(state, action: PayloadAction<{ pageId: string; index: number; block: Block }>) {
        const { pageId, index, block } = action.payload;
        const page = state.pages.entities[pageId];
        if (page === undefined) return;
        blocksAdapter.addOne(state.blocks, block);
        page.blockIds.splice(clamp(index, 0, page.blockIds.length), 0, block.id);
      },
      prepare(pageId: string, index: number, componentId: string) {
        const component = registry.get(componentId);
        if (component === undefined) {
          throw new Error(`Cannot insert unknown component "${componentId}"`);
        }
        return { payload: { pageId, index, block: createBlock(component.definition) } };
      },
    },
    blockPasted(
      state,
      action: PayloadAction<{ target: BlockListTarget; index: number; block: Block }>,
    ) {
      const { target, index, block } = action.payload;
      if (state.blocks.entities[block.id] !== undefined) return;
      const list = targetList(state, target, block);
      if (list === null) return;
      blocksAdapter.addOne(state.blocks, block);
      list.splice(clamp(index, 0, list.length), 0, block.id);
    },
    pageAdded(state, action: PayloadAction<NewPage>) {
      const { id, name, slug } = action.payload;
      if (!isValidNewPage(state, action.payload)) return;
      pagesAdapter.addOne(state.pages, createPage(id, name.trim(), slug));
    },
    pageDuplicated(
      state,
      action: PayloadAction<{
        sourcePageId: string;
        page: NewPage;
        blockIds: Record<string, string>;
      }>,
    ) {
      const { sourcePageId, page, blockIds } = action.payload;
      const source = state.pages.entities[sourcePageId];
      if (source === undefined || !isValidNewPage(state, page)) return;
      const copiedBlockIds: string[] = [];
      for (const blockId of source.blockIds) {
        const block = state.blocks.entities[blockId];
        const copyId = blockIds[blockId];
        if (block === undefined || copyId === undefined) continue;
        blocksAdapter.addOne(state.blocks, { ...structuredClone(current(block)), id: copyId });
        copiedBlockIds.push(copyId);
      }
      const copy: Page = {
        ...structuredClone(current(source)),
        id: page.id,
        name: page.name.trim(),
        slug: page.slug,
        blockIds: copiedBlockIds,
      };
      pagesAdapter.addOne(state.pages, copy);
      const { ids } = state.pages;
      ids.splice(ids.indexOf(page.id), 1);
      ids.splice(ids.indexOf(sourcePageId) + 1, 0, page.id);
    },
    pageRenamed(state, action: PayloadAction<{ pageId: string; name: string; slug: string }>) {
      const { pageId, slug } = action.payload;
      const page = state.pages.entities[pageId];
      const name = action.payload.name.trim();
      if (page === undefined || name === '') return;
      if (slugError(slug, slugsExcept(state, pageId)) !== null) return;
      page.name = name;
      page.slug = slug;
    },
    pageMoved(state, action: PayloadAction<{ pageId: string; toIndex: number }>) {
      const { pageId, toIndex } = action.payload;
      const { ids } = state.pages;
      const from = ids.indexOf(pageId);
      if (from === -1) return;
      const to = clamp(toIndex, 0, ids.length - 1);
      if (to === from) return;
      ids.splice(from, 1);
      ids.splice(to, 0, pageId);
    },
    pageRemoved(state, action: PayloadAction<{ pageId: string }>) {
      const { pageId } = action.payload;
      const page = state.pages.entities[pageId];
      const isProtected = pageId === state.pages.homePageId || state.pages.ids.length <= 1;
      if (page === undefined || isProtected) return;
      blocksAdapter.removeMany(state.blocks, page.blockIds);
      pagesAdapter.removeOne(state.pages, pageId);
      removeAssetIfUnused(state, page.seo.socialImageAssetId);
    },
    pageSlugSet: {
      reducer(state, action: PayloadAction<{ pageId: string; slug: string }, string, EditMeta>) {
        const { pageId, slug } = action.payload;
        const page = state.pages.entities[pageId];
        if (page === undefined || slugError(slug, slugsExcept(state, pageId)) !== null) return;
        page.slug = slug;
      },
      prepare(pageId: string, slug: string, kind: EditKind) {
        return { payload: { pageId, slug }, meta: editMeta(kind, `slug:${pageId}`) };
      },
    },
    pageSeoSet: {
      reducer(
        state,
        action: PayloadAction<{ pageId: string; key: SeoTextKey; value: string }, string, EditMeta>,
      ) {
        const { pageId, key, value } = action.payload;
        const page = state.pages.entities[pageId];
        if (page === undefined || !isSeoTextKey(key)) return;
        if (value.trim() === '') {
          delete page.seo[key];
          return;
        }
        page.seo[key] = value;
      },
      prepare(pageId: string, key: SeoTextKey, value: string, kind: EditKind) {
        return { payload: { pageId, key, value }, meta: editMeta(kind, `seo:${pageId}:${key}`) };
      },
    },
    pageSocialImageSet: {
      reducer(state, action: PayloadAction<{ pageId: string; asset: Asset | null }>) {
        const { pageId, asset } = action.payload;
        const page = state.pages.entities[pageId];
        if (page === undefined) return;
        if (asset !== null && !isImageUpload(asset, SOCIAL_IMAGE_TYPES)) return;
        const previousAssetId = page.seo.socialImageAssetId;
        if (asset === null) {
          delete page.seo.socialImageAssetId;
        } else {
          state.assets[asset.id] = asset;
          page.seo.socialImageAssetId = asset.id;
        }
        removeAssetIfUnused(state, previousAssetId);
      },
      prepare(pageId: string, upload: ImageUpload | null) {
        return { payload: { pageId, asset: assetFromUpload(upload) } };
      },
    },
    settingSet: {
      reducer(state, action: PayloadAction<{ key: SettingKey; value: string }, string, EditMeta>) {
        const { key, value } = action.payload;
        if (settingError(key, value) !== null) {
          console.warn(`Ignored an invalid value for the project setting "${key}"`);
          return;
        }
        if (key === 'baseUrl') {
          const baseUrl = value.trim();
          if (baseUrl === '') {
            delete state.settings.baseUrl;
          } else {
            state.settings.baseUrl = baseUrl;
          }
          return;
        }
        state.settings[key] = key === 'title' || key === 'language' ? value.trim() : value;
      },
      prepare(key: SettingKey, value: string, kind: EditKind) {
        return { payload: { key, value }, meta: editMeta(kind, `setting:${key}`) };
      },
    },
    projectImageSet: {
      reducer(state, action: PayloadAction<{ role: ProjectImageRole; asset: Asset | null }>) {
        const { role, asset } = action.payload;
        const key = PROJECT_IMAGE_KEYS[role];
        if (asset !== null && !isImageUpload(asset, PROJECT_IMAGE_TYPES[role])) return;
        const previousAssetId = state.settings[key];
        if (asset === null) {
          delete state.settings[key];
        } else {
          state.assets[asset.id] = asset;
          state.settings[key] = asset.id;
        }
        removeAssetIfUnused(state, previousAssetId);
      },
      prepare(role: ProjectImageRole, upload: ImageUpload | null) {
        return { payload: { role, asset: assetFromUpload(upload) } };
      },
    },
    homePageSet(state, action: PayloadAction<{ pageId: string }>) {
      if (state.pages.entities[action.payload.pageId] === undefined) return;
      state.pages.homePageId = action.payload.pageId;
    },
    blockMoved(state, action: PayloadAction<{ blockId: string; toIndex: number }>) {
      const { blockId, toIndex } = action.payload;
      const list = findBlockList(state, blockId);
      if (list === null) return;
      const from = list.indexOf(blockId);
      const to = clamp(toIndex, 0, list.length - 1);
      if (to === from) return;
      list.splice(from, 1);
      list.splice(to, 0, blockId);
    },
    blockDuplicated: {
      reducer(state, action: PayloadAction<{ blockId: string; newBlockId: string }>) {
        const { blockId, newBlockId } = action.payload;
        const source = state.blocks.entities[blockId];
        const list = findBlockList(state, blockId);
        if (source === undefined || list === null) return;
        const copy = structuredClone(current(source));
        blocksAdapter.addOne(state.blocks, { ...copy, id: newBlockId });
        list.splice(list.indexOf(blockId) + 1, 0, newBlockId);
      },
      prepare(blockId: string) {
        return { payload: { blockId, newBlockId: crypto.randomUUID() } };
      },
    },
    blockRemoved(state, action: PayloadAction<{ blockId: string }>) {
      const { blockId } = action.payload;
      const list = findBlockList(state, blockId);
      if (list === null) return;
      list.splice(list.indexOf(blockId), 1);
      blocksAdapter.removeOne(state.blocks, blockId);
    },
    blockShared(
      state,
      action: PayloadAction<{ blockId: string; slot: SharedSlot; pageId: string }>,
    ) {
      const { blockId, slot, pageId } = action.payload;
      const page = state.pages.entities[pageId];
      const block = state.blocks.entities[blockId];
      const category = block === undefined ? null : blockCategory(block);
      if (page === undefined || category === null) return;
      const index = page.blockIds.indexOf(blockId);
      if (index === -1 || slotForCategory(category) !== slot) return;
      page.blockIds.splice(index, 1);
      state.sharedSlots[slot].push(blockId);
      if (slot === 'header') {
        page.showSharedHeader = true;
      } else {
        page.showSharedFooter = true;
      }
    },
    blockUnshared(state, action: PayloadAction<{ blockId: string; pageId: string }>) {
      const { blockId, pageId } = action.payload;
      const page = state.pages.entities[pageId];
      const slot = sharedSlotOf(state, blockId);
      if (page === undefined || slot === null) return;
      const list = state.sharedSlots[slot];
      list.splice(list.indexOf(blockId), 1);
      if (slot === 'header') {
        page.blockIds.unshift(blockId);
      } else {
        page.blockIds.push(blockId);
      }
    },
    pageSharedSlotShown(
      state,
      action: PayloadAction<{ pageId: string; slot: SharedSlot; isShown: boolean }>,
    ) {
      const { pageId, slot, isShown } = action.payload;
      const page = state.pages.entities[pageId];
      if (page === undefined) return;
      if (slot === 'header') {
        page.showSharedHeader = isShown;
      } else {
        page.showSharedFooter = isShown;
      }
    },
    blockDisabledSet(state, action: PayloadAction<{ blockId: string; disabled: boolean }>) {
      const block = state.blocks.entities[action.payload.blockId];
      if (block !== undefined) block.disabled = action.payload.disabled;
    },
    blockValueSet: {
      reducer(
        state,
        action: PayloadAction<{ blockId: string; name: string; value: unknown }, string, EditMeta>,
      ) {
        const { blockId, name, value } = action.payload;
        const block = state.blocks.entities[blockId];
        if (block?.kind !== 'component' || Object.is(block.values[name], value)) return;
        block.values[name] = value;
      },
      prepare(blockId: string, name: string, value: unknown, kind: EditKind) {
        return {
          payload: { blockId, name, value },
          meta: editMeta(kind, `value:${blockId}:${name}`),
        };
      },
    },
    blockOverrideSet: {
      reducer(
        state,
        action: PayloadAction<{ blockId: string; token: string; value: string }, string, EditMeta>,
      ) {
        const { blockId, token, value } = action.payload;
        const block = state.blocks.entities[blockId];
        if (block?.kind !== 'component' || !isOverridable(block, token)) return;
        if (referencedTokenName(value) === token) {
          delete block.overrides[token];
          return;
        }
        if (!isSafeCssValue(value) || createsOverrideCycle(block.overrides, token, value)) return;
        block.overrides[token] = value.trim();
      },
      prepare(blockId: string, token: string, value: string, kind: EditKind) {
        return {
          payload: { blockId, token, value },
          meta: editMeta(kind, `override:${blockId}:${token}`),
        };
      },
    },
    blockSectionThemeSet(state, action: PayloadAction<{ blockId: string; themeId: string }>) {
      const { blockId, themeId } = action.payload;
      const block = state.blocks.entities[blockId];
      const theme = sectionThemeById(themeId);
      if (block?.kind !== 'component' || theme === null) return;
      const component = registry.get(block.componentId);
      if (component === undefined || !supportsSectionThemes(component.definition)) return;
      for (const token of THEMED_TOKENS) delete block.overrides[token];
      Object.assign(block.overrides, theme.overrides);
    },
    blockOverrideRemoved(state, action: PayloadAction<{ blockId: string; token: string }>) {
      const block = state.blocks.entities[action.payload.blockId];
      if (block?.kind === 'component') delete block.overrides[action.payload.token];
    },
    blockConvertedToHtml(
      state,
      action: PayloadAction<{ blockId: string; html: string; sourceComponentId: string }>,
    ) {
      const { blockId, html, sourceComponentId } = action.payload;
      const block = state.blocks.entities[blockId];
      if (block?.kind !== 'component') return;
      const converted: HtmlBlock = {
        id: block.id,
        kind: 'html',
        html,
        disabled: block.disabled,
        extraClasses: [...block.extraClasses],
        hideOn: [...block.hideOn],
        sourceComponentId,
      };
      if (block.anchor !== undefined) converted.anchor = block.anchor;
      state.blocks.entities[blockId] = converted;
    },
    blockHtmlSet: {
      reducer(state, action: PayloadAction<{ blockId: string; html: string }, string, EditMeta>) {
        const block = state.blocks.entities[action.payload.blockId];
        if (block?.kind !== 'html' || block.html === action.payload.html) return;
        block.html = action.payload.html;
      },
      prepare(blockId: string, html: string, kind: EditKind) {
        return { payload: { blockId, html }, meta: editMeta(kind, `html:${blockId}`) };
      },
    },
    blockAdvancedSet: {
      reducer(
        state,
        action: PayloadAction<{ blockId: string; change: AdvancedChange }, string, EditMeta>,
      ) {
        const block = state.blocks.entities[action.payload.blockId];
        if (block !== undefined) applyAdvancedChange(block, action.payload.change);
      },
      prepare(blockId: string, change: AdvancedChange, kind: EditKind) {
        return {
          payload: { blockId, change },
          meta: editMeta(kind, `advanced:${blockId}:${change.key}`),
        };
      },
    },
    tokenSet: {
      reducer(state, action: PayloadAction<{ name: string; value: string }, string, EditMeta>) {
        const token = state.designSystem.tokens[action.payload.name];
        if (token === undefined || !isSafeCssValue(action.payload.value)) return;
        token.value = action.payload.value.trim();
        if (isWeightToken(token.name)) syncFontWeights(state.designSystem);
      },
      prepare(payload: { name: string; value: string }, kind: EditKind) {
        return { payload, meta: editMeta(kind, `token:${payload.name}`) };
      },
    },
    fontSet(state, action: PayloadAction<FontChange>) {
      const { role, family, stack } = action.payload;
      const familyToken = state.designSystem.tokens[`--font-${role}`];
      if (!isFontRole(role) || familyToken === undefined || !isSafeCssValue(stack)) return;
      const available = availableWeightsOf(action.payload);
      if (family !== null && (family.trim() === '' || available.length === 0)) return;
      familyToken.value = stack;
      for (const name of WEIGHT_TOKENS[role]) {
        const token = state.designSystem.tokens[name];
        if (token !== undefined)
          token.value = String(nearestWeight(Number(token.value), available));
      }
      const fonts = state.designSystem.fonts.filter((font) => font.role !== role);
      if (family !== null) fonts.push({ role, family, weights: [] });
      state.designSystem.fonts = fonts;
      syncFontWeights(state.designSystem);
    },
    designSystemApplied(state, action: PayloadAction<DesignSystem>) {
      state.designSystem = action.payload;
    },
    iconSetChanged(state, action: PayloadAction<string>) {
      const info = iconSetInfo(action.payload);
      if (info === undefined || info.isBrandOnly) return;
      state.designSystem.iconSet = action.payload;
    },
    tokensSet: {
      reducer(state, action: PayloadAction<TokensChange, string, EditMeta>) {
        const { values, generators } = action.payload;
        for (const [name, value] of Object.entries(values)) {
          const token = state.designSystem.tokens[name];
          if (token !== undefined && isSafeCssValue(value)) token.value = value.trim();
        }
        for (const [key, value] of Object.entries(generators ?? {})) {
          if (!isGeneratorKey(key) || !Number.isFinite(value) || value <= 0) continue;
          state.designSystem.generators[key] = value;
        }
        syncFontWeights(state.designSystem);
      },
      prepare(payload: TokensChange, kind: EditKind) {
        const names = Object.keys(payload.values);
        names.sort();
        return { payload, meta: editMeta(kind, `tokens:${names.join(',')}`) };
      },
    },
  },
});

export const {
  pageAdded,
  pageDuplicated,
  pageRenamed,
  pageMoved,
  pageRemoved,
  pageSlugSet,
  pageSeoSet,
  pageSocialImageSet,
  settingSet,
  projectImageSet,
  homePageSet,
  blockInserted,
  blockPasted,
  blockMoved,
  blockDuplicated,
  blockRemoved,
  blockShared,
  blockUnshared,
  pageSharedSlotShown,
  blockDisabledSet,
  blockValueSet,
  blockOverrideSet,
  blockOverrideRemoved,
  blockSectionThemeSet,
  blockConvertedToHtml,
  blockHtmlSet,
  blockAdvancedSet,
  tokenSet,
  tokensSet,
  fontSet,
  iconSetChanged,
  designSystemApplied,
} = projectSlice.actions;
