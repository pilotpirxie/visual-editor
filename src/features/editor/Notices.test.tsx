import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { noticeDismissed, noticeShown } from '../../app/editorSlice';
import { dispatch, store } from '../../app/store';
import { click, getButton, render, runInAct } from '../../test/dom';
import { Notices } from './Notices';

beforeEach(() => {
  vi.useFakeTimers();
  for (const notice of store.getState().editor.notices) {
    dispatch(noticeDismissed(notice.id));
  }
});

afterEach(() => {
  vi.useRealTimers();
});

describe('Notices', () => {
  it('shows notices, marks errors as alerts and dismisses them on request', () => {
    const { container } = render(<Notices />);
    runInAct(() => {
      dispatch(noticeShown('info', 'Saved a copy'));
      dispatch(noticeShown('error', 'Could not open the file'));
    });
    expect(container.querySelectorAll('.ve-toast')).toHaveLength(2);
    expect(container.querySelector('[role="alert"]')?.textContent).toBe('Could not open the file');
    click(getButton(container, 'Dismiss'));
    expect(container.querySelectorAll('.ve-toast')).toHaveLength(1);
  });

  it('hides a notice after a few seconds and keeps at most three', () => {
    const { container } = render(<Notices />);
    runInAct(() => {
      for (const text of ['one', 'two', 'three', 'four']) dispatch(noticeShown('info', text));
    });
    expect(container.textContent).not.toContain('one');
    expect(container.querySelectorAll('.ve-toast')).toHaveLength(3);
    runInAct(() => {
      vi.advanceTimersByTime(6000);
    });
    expect(container.querySelectorAll('.ve-toast')).toHaveLength(0);
  });
});
