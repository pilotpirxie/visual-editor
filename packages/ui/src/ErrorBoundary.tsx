import { Component, type ErrorInfo, type ReactNode } from 'react';

type ErrorBoundaryProps = {
  fallback(error: Error, reset: () => void): ReactNode;
  resetKey?: unknown;
  onError?(error: Error, info: ErrorInfo): void;
  children: ReactNode;
};

type ErrorBoundaryState = { error: Error | null };

function asError(value: unknown): Error {
  return value instanceof Error ? value : new Error(String(value));
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return { error: asError(error) };
  }

  componentDidCatch(error: unknown, info: ErrorInfo): void {
    this.props.onError?.(asError(error), info);
  }

  componentDidUpdate(previous: ErrorBoundaryProps): void {
    if (this.state.error === null || Object.is(previous.resetKey, this.props.resetKey)) return;
    this.reset();
  }

  reset = (): void => {
    this.setState({ error: null });
  };

  render(): ReactNode {
    if (this.state.error !== null) return this.props.fallback(this.state.error, this.reset);
    return this.props.children;
  }
}
