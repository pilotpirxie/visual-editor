import { useEffect, useRef, useState, type FormEvent, type JSX, type ReactNode } from 'react';
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

export function focusReturnTarget(element: Element | null): HTMLElement | null {
  if (!(element instanceof HTMLElement) || element === element.ownerDocument.body) return null;
  const popover = element.closest<HTMLElement>('[popover]');
  if (popover === null || popover.id === '') return element;
  const invoker = element.ownerDocument.querySelector<HTMLElement>(
    `[popovertarget="${CSS.escape(popover.id)}"]`,
  );
  return invoker ?? element;
}

export function restoreFocus(target: HTMLElement | null): void {
  if (target === null || !target.isConnected) return;
  const active = target.ownerDocument.activeElement;
  const isFocusLost = active === null || active === target.ownerDocument.body;
  if (isFocusLost) target.focus();
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
  const [returnTarget] = useState(() => focusReturnTarget(document.activeElement));

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog !== null && !dialog.open) dialog.showModal();
  }, []);

  useEffect(() => () => restoreFocus(returnTarget), [returnTarget]);

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
