import type { Project } from '../../app/types';
import type { RegisteredComponent } from '../../components/types';
import { siteFormOf } from '../../render/handlebars';
import { collectExportWarnings, FORM_ACTION_FIELD } from '../export/exportWarnings';

type LaunchFix = 'settings' | 'pages' | 'export';

export type LaunchCheck = {
  id: string;
  label: string;
  advice: string;
  isDone: boolean;
  fix: LaunchFix;
};

const PRIVACY_PAGE = /privacy|privat|prywatn|datenschutz|confidential/i;
const NOT_FOUND_SLUG = '404';

type FormState = { hasForms: boolean; hasUnsentForm: boolean };

function formStateOf(
  project: Project,
  registry: ReadonlyMap<string, RegisteredComponent>,
): FormState {
  const { formService, formTarget } = project.settings;
  const hasSiteForm = siteFormOf(formService, formTarget) !== null;
  const state: FormState = { hasForms: false, hasUnsentForm: false };
  for (const blockId of project.blocks.ids) {
    const block = project.blocks.entities[blockId];
    if (block === undefined || block.disabled || block.kind !== 'component') continue;
    const fields = registry.get(block.componentId)?.definition.fields ?? [];
    if (!fields.some((field) => field.name === FORM_ACTION_FIELD)) continue;
    state.hasForms = true;
    const ownAction = block.values[FORM_ACTION_FIELD];
    const hasOwnAction = typeof ownAction === 'string' && ownAction.trim() !== '';
    if (!hasOwnAction && !hasSiteForm) state.hasUnsentForm = true;
  }
  return state;
}

function hasPage(project: Project, matches: (slug: string, name: string) => boolean): boolean {
  for (const pageId of project.pages.ids) {
    const page = project.pages.entities[pageId];
    if (page !== undefined && matches(page.slug, page.name)) return true;
  }
  return false;
}

export function launchChecks(
  project: Project,
  registry: ReadonlyMap<string, RegisteredComponent>,
  isPublished: boolean,
): LaunchCheck[] {
  const { settings } = project;
  const openProblems = collectExportWarnings(project, registry).length;
  const forms = formStateOf(project, registry);
  const checks: LaunchCheck[] = [
    {
      id: 'description',
      label: 'The site has a description',
      advice: 'Search engines and social networks show this text under your site name.',
      isDone: settings.description.trim() !== '',
      fix: 'settings',
    },
    {
      id: 'favicon',
      label: 'The site has a favicon',
      advice: 'Add the small icon that browsers show in the tab.',
      isDone: settings.faviconAssetId !== undefined,
      fix: 'settings',
    },
    {
      id: 'social-image',
      label: 'Shared links show a picture',
      advice: 'Add a default social image for links shared in chats and on social networks.',
      isDone: settings.socialImageAssetId !== undefined,
      fix: 'settings',
    },
    {
      id: 'base-url',
      label: 'The site knows its address',
      advice: 'Enter the address the site will live at, so the sitemap and shared links are right.',
      isDone: settings.baseUrl !== undefined && settings.baseUrl.trim() !== '',
      fix: 'settings',
    },
    {
      id: 'indexing',
      label: 'Search engines may list the site',
      advice: 'Indexing is switched off, so the site will not show up in search results.',
      isDone: settings.indexable,
      fix: 'settings',
    },
  ];
  if (forms.hasForms) {
    checks.push({
      id: 'forms',
      label: 'Forms send messages somewhere',
      advice: 'Choose where forms go in Project settings, under Forms.',
      isDone: !forms.hasUnsentForm,
      fix: 'settings',
    });
  }
  checks.push(
    {
      id: 'privacy',
      label: 'There is a privacy policy page',
      advice: 'Add a page named Privacy policy that says how visitor data is used.',
      isDone: hasPage(project, (slug, name) => PRIVACY_PAGE.test(slug) || PRIVACY_PAGE.test(name)),
      fix: 'pages',
    },
    {
      id: 'not-found',
      label: 'Broken links land on a helpful page',
      advice: 'Add a page with the address 404 from the HTTP codes blocks.',
      isDone: hasPage(project, (slug) => slug === NOT_FOUND_SLUG),
      fix: 'pages',
    },
    {
      id: 'problems',
      label: 'The pages have no open problems',
      advice: `Export lists ${openProblems} ${openProblems === 1 ? 'thing' : 'things'} to fix, each with a Fix button.`,
      isDone: openProblems === 0,
      fix: 'export',
    },
    {
      id: 'published',
      label: 'The site is online',
      advice: 'Publish it from Export, or download the zip and upload it to your host.',
      isDone: isPublished,
      fix: 'export',
    },
  );
  return checks;
}
