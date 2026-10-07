import { useEffect, useRef, type FormEvent, type JSX, type ReactNode } from 'react';
import { classNames } from './classNames';
import { Title } from './Title';
import './Dialog.css';

type DialogProps = {
  labelId: string;
  describedBy?: string;
  size?: 'normal' | 'wide' | 'full';
  className?: string;
  onClose(): void;
  children: ReactNode;
};

export function closeDialogOf(element: Element): void {
  element.closest('dialog')?.close();
}

export function Dialog({
  labelId,
  describedBy,
  size = 'normal',
  className,
  onClose,
  children,
}: DialogProps): JSX.Element {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog !== null && !dialog.open) dialog.showModal();
  }, []);

  return (
    <dialog
      ref={dialogRef}
      className={classNames('ui-dialog', className)}
      data-size={size}
      aria-labelledby={labelId}
      aria-describedby={describedBy}
      onClose={onClose}
    >
      {children}
    </dialog>
  );
}

type DialogBodyProps = {
  titleId: string;
  title: ReactNode;
  className?: string;
  onSubmit?(event: FormEvent<HTMLFormElement>): void;
  children: ReactNode;
};

export function DialogBody({
  titleId,
  title,
  className,
  onSubmit,
  children,
}: DialogBodyProps): JSX.Element {
  const content = (
    <>
      <Title id={titleId}>{title}</Title>
      {children}
    </>
  );
  if (onSubmit === undefined) {
    return <div className={classNames('ui-dialog-body', className)}>{content}</div>;
  }
  return (
    <form className={classNames('ui-dialog-body', className)} onSubmit={onSubmit}>
      {content}
    </form>
  );
}

export function DialogActions({ children }: { children: ReactNode }): JSX.Element {
  return <div className="ui-dialog-actions">{children}</div>;
}
