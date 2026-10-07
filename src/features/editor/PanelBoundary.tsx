import type { ErrorInfo, JSX, ReactNode } from 'react';
import { Button, classNames, ErrorBoundary } from '../../../packages/ui/src';

type PanelBoundaryProps = { name: string; className?: string; children: ReactNode };

function reportCrash(name: string, error: Error, info: ErrorInfo): void {
  console.error(`The ${name} ran into a problem`, error, info.componentStack);
}

export function PanelBoundary({ name, className, children }: PanelBoundaryProps): JSX.Element {
  return (
    <ErrorBoundary
      onError={(error, info) => reportCrash(name, error, info)}
      fallback={(_error, reset) => (
        <div className={classNames('ve-panel-error', className)} role="alert">
          <p>This {name} ran into a problem. Your work is saved.</p>
          <Button onClick={reset}>Try again</Button>
        </div>
      )}
    >
      {children}
    </ErrorBoundary>
  );
}
