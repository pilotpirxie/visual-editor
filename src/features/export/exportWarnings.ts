import { visibleBlockLists } from '../../app/blockLists';
import type { Page, Project } from '../../app/types';
import { forEachFieldValue } from '../../components/fieldValues';
import { isButtonValue, isImageValue, isLinkValue, validateField } from '../../components/fields';
import type { LinkValue, RegisteredComponent } from '../../components/types';
import { isPageIndexed } from '../../render/pageHead';

export type ExportWarning = { pageId: string | null; blockId: string | null; text: string };

const FORM_ACTION_FIELD = 'formAction';

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

function siteWarning(text: string): ExportWarning {
  return { pageId: null, blockId: null, text };
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
      ),
    );
  }
  if (withoutSocialImage.length > 0) {
    const pages = pageNameList.format(withoutSocialImage);
    warnings.push(
      siteWarning(
        `No social image on ${pages}. Add a default one in Project settings or one per page.`,
      ),
    );
  }
  return warnings;
}

export function collectExportWarnings(
  project: Project,
  registry: ReadonlyMap<string, RegisteredComponent>,
): ExportWarning[] {
  const warnings = searchEngineWarnings(project);
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
