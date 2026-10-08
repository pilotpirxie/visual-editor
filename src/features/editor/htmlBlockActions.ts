import { blockConvertedToHtml, blockHtmlSet } from '../../app/projectSlice';
import type { AppThunk } from '../../app/store';
import { blockLabel, componentsFor } from '../../components/registry';
import { takeSnapshot } from '../snapshots/snapshots';
import { stripUnsafeHtml } from '../../render/htmlSafety';
import { convertBlockToHtml } from '../../render/renderBlock';

export type HtmlEdit = { html: string; removed: string[] };

export function setBlockHtml(blockId: string, raw: string): AppThunk<HtmlEdit> {
  return (dispatch) => {
    const stripped = stripUnsafeHtml(raw);
    const html = stripped.removed.length > 0 ? stripped.html : raw;
    dispatch(blockHtmlSet(blockId, html, 'continuous'));
    return { html, removed: stripped.removed };
  };
}

export function convertToHtml(blockId: string): AppThunk<boolean> {
  return (dispatch, getState) => {
    const { project } = getState();
    const block = project.blocks.entities[blockId];
    if (block?.kind !== 'component') return false;
    const component = componentsFor(project).get(block.componentId);
    if (component === undefined) return false;
    const html = convertBlockToHtml(block, component, project);
    void dispatch(takeSnapshot(`Before converting ${blockLabel(block, project)} to HTML`, 'auto'));
    dispatch(blockConvertedToHtml({ blockId, html, sourceComponentId: block.componentId }));
    return true;
  };
}
