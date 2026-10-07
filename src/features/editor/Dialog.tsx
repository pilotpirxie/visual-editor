import { useEffect, useRef, type JSX, type ReactNode } from 'react';
import './dialog.css';

type DialogProps = {
  labelId: string;
  className?: string;
  onClose(): void;
  children: ReactNode;
};

export function closeDialogOf(element: Element): void {
  element.closest('dialog')?.close();
}

export function Dialog({ labelId, className, onClose, children }: DialogProps): JSX.Element {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog !== null && !dialog.open) dialog.showModal();
  }, []);

  const classes = className === undefined ? 've-dialog' : `ve-dialog ${className}`;
  return (
    <dialog ref={dialogRef} className={classes} aria-labelledby={labelId} onClose={onClose}>
      {children}
    </dialog>
  );
}
