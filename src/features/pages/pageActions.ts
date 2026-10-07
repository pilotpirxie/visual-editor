import { pageAnchorRequested } from '../../app/editorSlice';
import { pageAdded, pageDuplicated, pageRemoved } from '../../app/projectSlice';
import { editorPath, navigate } from '../../app/router';
import { uniqueSlug } from '../../app/slugs';
import { selectCurrentPage, type AppThunk, type RootState } from '../../app/store';
import { takeSnapshot } from '../snapshots/snapshots';

export type PageDraft = { name: string; slug: string; sourcePageId: string | null };

export function projectSlugs(state: RootState): string[] {
  const slugs: string[] = [];
  for (const id of state.project.pages.ids) {
    const page = state.project.pages.entities[id];
    if (page !== undefined) slugs.push(page.slug);
  }
  return slugs;
}

export function openPage(pageId: string, anchor: string | null = null): AppThunk {
  return (dispatch, getState) => {
    const state = getState();
    if (state.project.pages.entities[pageId] === undefined) return;
    if (selectCurrentPage(state).id === pageId) return;
    dispatch(pageAnchorRequested(anchor));
    navigate(editorPath(state.project.id, pageId));
  };
}

export function addPage({ name, slug, sourcePageId }: PageDraft): AppThunk<string | null> {
  return (dispatch, getState) => {
    const id = crypto.randomUUID();
    const page = { id, name, slug };
    const source =
      sourcePageId === null ? undefined : getState().project.pages.entities[sourcePageId];
    if (source === undefined) {
      dispatch(pageAdded(page));
    } else {
      const blockIds: Record<string, string> = {};
      for (const blockId of source.blockIds) blockIds[blockId] = crypto.randomUUID();
      dispatch(pageDuplicated({ sourcePageId: source.id, page, blockIds }));
    }
    if (getState().project.pages.entities[id] === undefined) return null;
    dispatch(openPage(id));
    return id;
  };
}

export function duplicatePage(sourcePageId: string): AppThunk<string | null> {
  return (dispatch, getState) => {
    const state = getState();
    const source = state.project.pages.entities[sourcePageId];
    if (source === undefined) return null;
    return dispatch(
      addPage({
        name: `${source.name} copy`,
        slug: uniqueSlug(`${source.slug}-copy`, projectSlugs(state)),
        sourcePageId,
      }),
    );
  };
}

export function deletePage(pageId: string): AppThunk {
  return (dispatch, getState) => {
    const page = getState().project.pages.entities[pageId];
    if (page === undefined) return;
    void dispatch(takeSnapshot(`Before deleting ${page.name}`, 'auto'));
    dispatch(pageRemoved({ pageId }));
  };
}
