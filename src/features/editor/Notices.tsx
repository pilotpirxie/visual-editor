import { useEffect, useState, type JSX } from 'react';
import { noticeDismissed, type Notice } from '../../app/editorSlice';
import { dispatch, useStore } from '../../app/store';
import { IconButton } from '../../../packages/ui/src';

const NOTICE_TIMEOUT_MS = 6000;

function NoticeItem({ notice }: { notice: Notice }): JSX.Element {
  const [isPaused, setIsPaused] = useState(false);
  const isLasting = notice.tone === 'error';

  useEffect(() => {
    if (isLasting || isPaused) return;
    const timer = window.setTimeout(() => dispatch(noticeDismissed(notice.id)), NOTICE_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [notice.id, isLasting, isPaused]);

  return (
    <li
      className="ve-toast"
      data-tone={notice.tone}
      onPointerEnter={() => setIsPaused(true)}
      onPointerLeave={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onBlur={() => setIsPaused(false)}
    >
      <span>{notice.text}</span>
      <IconButton label="Dismiss" icon="x" onClick={() => dispatch(noticeDismissed(notice.id))} />
    </li>
  );
}

export function Notices(): JSX.Element {
  const notices = useStore((state) => state.editor.notices);
  const errors: Notice[] = [];
  const updates: Notice[] = [];
  for (const notice of notices) {
    if (notice.tone === 'error') {
      errors.push(notice);
    } else {
      updates.push(notice);
    }
  }
  return (
    <div className="ve-toasts">
      <ol className="ve-toast-list" role="alert">
        {errors.map((notice) => (
          <NoticeItem key={notice.id} notice={notice} />
        ))}
      </ol>
      <ol className="ve-toast-list" role="status">
        {updates.map((notice) => (
          <NoticeItem key={notice.id} notice={notice} />
        ))}
      </ol>
    </div>
  );
}
