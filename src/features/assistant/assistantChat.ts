import { readAppSettings } from '../../app/appSettings';
import { assistantAnswered, assistantAsked } from '../../app/editorSlice';
import { describeError } from '../../app/errors';
import { projectRestored } from '../../app/projectSlice';
import { selectCurrentPage, type AppThunk } from '../../app/store';
import { applyProjectEdit, planProjectEdit, type ProjectEdit } from './editProject';
import type { Exchange } from './editSteps';
import { askWith, AssistantError } from './openRouter';

const MAX_EARLIER_EXCHANGES = 4;
const STOPPED_REPLY = 'Stopped. Nothing was changed.';
const NO_CHANGE_REPLY = 'Nothing was changed.';
const CHANGED_REPLY = 'Done.';

let running: AbortController | null = null;

export function stopAssistant(): void {
  running?.abort();
}

export function askAssistant(request: string): AppThunk<Promise<void>> {
  return async (dispatch, getState) => {
    const setup = readAppSettings();
    const state = getState();
    const { project, editor } = state;
    if (editor.isReadOnly) return;

    const earlier: Exchange[] = [];
    for (const message of editor.assistantMessages) {
      if (earlier.length === MAX_EARLIER_EXCHANGES) break;
      if (message.status === 'done') {
        earlier.unshift({ request: message.request, reply: message.reply });
      }
    }
    running?.abort();
    const run = new AbortController();
    running = run;
    const id = crypto.randomUUID();
    dispatch(assistantAsked({ id, request }));

    let edit: ProjectEdit;
    try {
      edit = await planProjectEdit(
        (stepRequest, signal) => askWith(setup, stepRequest, signal),
        {
          project,
          openPageId: selectCurrentPage(state).id,
          selectedBlockId: editor.selectedBlockId,
          request,
          earlier,
        },
        run.signal,
      );
    } catch (error) {
      const isStopped = error instanceof AssistantError && error.kind === 'cancelled';
      if (!isStopped) console.error('The assistant could not change the project', error);
      const reply = isStopped ? STOPPED_REPLY : describeError(error);
      dispatch(assistantAnswered({ id, status: 'failed', reply, changes: [] }));
      return;
    }

    const latest = getState().project;
    if (latest.id !== project.id) return;
    const applied = applyProjectEdit(latest, edit.changes);
    if (applied.project !== latest) dispatch(projectRestored(applied.project));
    let reply = edit.reply;
    if (reply === '') reply = applied.summary.length > 0 ? CHANGED_REPLY : NO_CHANGE_REPLY;
    dispatch(assistantAnswered({ id, status: 'done', reply, changes: applied.summary }));
  };
}
