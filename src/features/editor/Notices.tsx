import { useEffect, type JSX } from 'react';
import { noticeDismissed, type Notice } from '../../app/editorSlice';
import { dispatch, useStore } from '../../app/store';
import { Icon } from './Icon';

const NOTICE_TIMEOUT_MS = 6000;

function NoticeItem({ notice }: { notice: Notice }): JSX.Element {
  useEffect(() => {
    const timer = window.setTimeout(() => dispatch(noticeDismissed(notice.id)), NOTICE_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [notice.id]);

  return (
    <li className="ve-toast" data-tone={notice.tone}>
      <span role={notice.tone === 'error' ? 'alert' : undefined}>{notice.text}</span>
      <button
        type="button"
        className="ve-icon-button"
        aria-label="Dismiss"
        onClick={() => dispatch(noticeDismissed(notice.id))}
      >
        <Icon name="x" />
      </button>
    </li>
  );
}

export function Notices(): JSX.Element {
  const notices = useStore((state) => state.editor.notices);
  return (
    <ol className="ve-toasts" role="status" aria-live="polite">
      {notices.map((notice) => (
        <NoticeItem key={notice.id} notice={notice} />
      ))}
    </ol>
  );
}
