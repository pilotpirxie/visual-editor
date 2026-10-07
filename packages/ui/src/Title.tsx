import type { JSX, ReactNode } from 'react';
import { classNames } from './classNames';
import './Title.css';

type TitleProps = { id?: string; className?: string; children: ReactNode };

export function Title({ id, className, children }: TitleProps): JSX.Element {
  return (
    <h2 id={id} className={classNames('ui-title', className)}>
      {children}
    </h2>
  );
}
