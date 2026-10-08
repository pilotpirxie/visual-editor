import { visibleBlockLists } from '../../app/blockLists';
import type { Page, Project } from '../../app/types';
import { forEachFieldValue } from '../../components/fieldValues';
import { isButtonValue, isImageValue, isLinkValue, validateField } from '../../components/fields';
import type { LinkValue, RegisteredComponent } from '../../components/types';
import { isPageIndexed } from '../../render/pageHead';
import { activeSectionTheme } from '../../app/sectionThemes';
import {
  contrastRatio,
  contrastWarnings,
  MIN_TEXT_CONTRAST,
  resolveColor,
} from '../design-system/colors';

export type SiteArea = 'settings' | 'design';

export type ExportWarning = {
  pageId: string | null;
  blockId: string | null;
  text: string;
  siteArea?: SiteArea;
};

const FORM_ACTION_FIELD = 'formAction';
const RESERVED_ANCHOR = 'main';
const TEXT_TOKEN = '--color-text';
const BACKGROUND_TOKEN = '--color-background';

const pageNameList = new Intl.ListFormat('en', { style: 'long', type: 'conjunction' });

function isMissingPageLink(link: LinkValue, project: Project): boolean {
  const isPageLink = link.type === 'page' || link.type === 'section';
  return (
    isPageLink && link.pageId !== undefined && project.pages.entities[link.pageId] === undefined
  );
}

function linkOf(value: unknown): LinkValue | null {
  if (isLinkValue(value)) {
    return value;
  } else if (isButtonValue(value)) {
    return value.link;
  } else {
    return null;
  }
}

function htmlBlockWarnings(html: string, pageId: string | null, blockId: string): ExportWarning[] {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const missingAlt = doc.querySelectorAll('img:not([alt])').length;
  if (missingAlt === 0) return [];
  return [{ pageId, blockId, text: `HTML block: ${missingAlt} image(s) have no alt attribute.` }];
}

function blockWarnings(
  project: Project,
  blockId: string,
  pageId: string | null,
  registry: ReadonlyMap<string, RegisteredComponent>,
): ExportWarning[] {
  const block = project.blocks.entities[blockId];
  if (block === undefined || block.disabled) return [];
  if (block.kind === 'html') return htmlBlockWarnings(block.html, pageId, blockId);
  const component = registry.get(block.componentId);
  if (component === undefined) {
    return [
      {
        pageId,
        blockId,
        text: `A block needs the missing component “${block.componentId}” and is left out.`,
      },
    ];
  }
  const name = component.definition.name;
  const warnings: ExportWarning[] = [];
  function warn(text: string): void {
    warnings.push({ pageId, blockId, text: `${name}: ${text}` });
  }
  if (component.definition.category === 'modals' && block.anchor === undefined) {
    warn('nothing can open this modal. Give it an anchor id in the Advanced tab.');
  }
  const overrideRatio = overrideContrast(project, block.overrides);
  if (overrideRatio !== null && overrideRatio < MIN_TEXT_CONTRAST) {
    warn(
      `text on its custom background has a contrast of ${formatRatio(overrideRatio)}. ${CONTRAST_ADVICE}`,
    );
  }
  forEachFieldValue(component.definition.fields, block.values, (field, value) => {
    if (
      field.type === 'image' &&
      isImageValue(value) &&
      !value.decorative &&
      value.alt.trim() === ''
    ) {
      warn(`an image in “${field.label}” has no alt text.`);
    }
    const link = linkOf(value);
    if (link !== null && isMissingPageLink(link, project)) {
      warn(`“${field.label}” links to a page that was deleted.`);
    }
    if (field.required === true && validateField(field, value) !== null) {
      warn(`“${field.label}” is required but empty.`);
    }
    const isFormAction = field.name === FORM_ACTION_FIELD && typeof value === 'string';
    if (isFormAction && value.trim() === '') {
      warn('the form has no action URL, so it will not send anything.');
    }
  });
  return warnings;
}

function duplicateAnchorWarnings(
  project: Project,
  pageId: string,
  blockIds: string[],
): ExportWarning[] {
  const seen = new Set<string>();
  const warnings: ExportWarning[] = [];
  for (const blockId of blockIds) {
    const block = project.blocks.entities[blockId];
    if (block === undefined || block.disabled || block.anchor === undefined) continue;
    if (block.anchor === RESERVED_ANCHOR) {
      warnings.push({
        pageId,
        blockId,
        text: `The anchor id “${RESERVED_ANCHOR}” is kept for the page’s main content. Pick another one.`,
      });
    }
    if (seen.has(block.anchor)) {
      warnings.push({ pageId, blockId, text: `The anchor id “${block.anchor}” is used twice.` });
    }
    seen.add(block.anchor);
  }
  return warnings;
}

function hasDescription(project: Project, page: Page): boolean {
  const description = page.seo.description?.trim() || project.settings.description.trim();
  return description !== '';
}

function hasSocialImage(project: Project, page: Page): boolean {
  const assetId = page.seo.socialImageAssetId ?? project.settings.socialImageAssetId;
  return assetId !== undefined && project.assets[assetId] !== undefined;
}

function siteWarning(text: string, siteArea: SiteArea): ExportWarning {
  return { pageId: null, blockId: null, text, siteArea };
}

const CONTRAST_ADVICE = `Aim for at least ${MIN_TEXT_CONTRAST}:1.`;

function formatRatio(ratio: number): string {
  return `${ratio.toFixed(1)}:1`;
}

function overrideContrast(project: Project, overrides: Record<string, string>): number | null {
  const hasColorOverride =
    overrides[TEXT_TOKEN] !== undefined || overrides[BACKGROUND_TOKEN] !== undefined;
  if (!hasColorOverride || activeSectionTheme(overrides) !== null) return null;
  const { tokens } = project.designSystem;
  const text = overrides[TEXT_TOKEN] ?? tokens[TEXT_TOKEN]?.value;
  const background = overrides[BACKGROUND_TOKEN] ?? tokens[BACKGROUND_TOKEN]?.value;
  if (text === undefined || background === undefined) return null;
  return contrastRatio(resolveColor(text, tokens), resolveColor(background, tokens));
}

export function designContrastWarnings(project: Project): ExportWarning[] {
  const warnings: ExportWarning[] = [];
  for (const { foreground, background, ratio } of contrastWarnings(project.designSystem.tokens)) {
    warnings.push(
      siteWarning(
        `${foreground.label} on ${background.label} has a contrast of ${formatRatio(ratio)}. ${CONTRAST_ADVICE}`,
        'design',
      ),
    );
  }
  return warnings;
}

export function searchEngineWarnings(project: Project): ExportWarning[] {
  const withoutDescription: string[] = [];
  const withoutSocialImage: string[] = [];
  for (const pageId of project.pages.ids) {
    const page = project.pages.entities[pageId];
    if (page === undefined || !isPageIndexed(project, page)) continue;
    if (!hasDescription(project, page)) withoutDescription.push(page.name);
    if (!hasSocialImage(project, page)) withoutSocialImage.push(page.name);
  }
  const warnings: ExportWarning[] = [];
  if (withoutDescription.length > 0) {
    const pages = pageNameList.format(withoutDescription);
    warnings.push(
      siteWarning(
        `No meta description on ${pages}. Add one in Project settings or in each page’s settings.`,
        'settings',
      ),
    );
  }
  if (withoutSocialImage.length > 0) {
    const pages = pageNameList.format(withoutSocialImage);
    warnings.push(
      siteWarning(
        `No social image on ${pages}. Add a default one in Project settings or one per page.`,
        'settings',
      ),
    );
  }
  return warnings;
}

export function collectExportWarnings(
  project: Project,
  registry: ReadonlyMap<string, RegisteredComponent>,
): ExportWarning[] {
  const warnings = [...searchEngineWarnings(project), ...designContrastWarnings(project)];
  for (const blockId of [...project.sharedSlots.header, ...project.sharedSlots.footer]) {
    warnings.push(...blockWarnings(project, blockId, null, registry));
  }
  for (const pageId of project.pages.ids) {
    const page = project.pages.entities[pageId];
    if (page === undefined) continue;
    for (const blockId of page.blockIds) {
      warnings.push(...blockWarnings(project, blockId, pageId, registry));
    }
    const lists = visibleBlockLists(project, page);
    warnings.push(
      ...duplicateAnchorWarnings(project, pageId, [
        ...lists.header,
        ...lists.page,
        ...lists.footer,
      ]),
    );
  }
  return warnings;
}
