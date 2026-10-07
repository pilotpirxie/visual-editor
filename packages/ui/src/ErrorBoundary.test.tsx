import { describe, expect, it, vi } from 'vitest';
import { useState, type JSX } from 'react';
import { click, render } from '../../../src/test/dom';
import { ErrorBoundary } from './ErrorBoundary';

let shouldThrow = true;

function Fragile({ label }: { label: string }): JSX.Element {
  if (shouldThrow) throw new Error(`${label} broke`);
  return <p>{label} works</p>;
}

function fallback(error: Error, reset: () => void): JSX.Element {
  return (
    <div role="alert">
      {error.message}
      <button type="button" onClick={reset}>
        Try again
      </button>
    </div>
  );
}

describe('ErrorBoundary', () => {
  it('shows the fallback instead of a crashed child and recovers on reset', () => {
    shouldThrow = true;
    const onError = vi.fn();
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { container } = render(
      <ErrorBoundary fallback={fallback} onError={onError}>
        <Fragile label="Panel" />
      </ErrorBoundary>,
    );
    expect(container.textContent).toContain('Panel broke');
    expect(onError).toHaveBeenCalledOnce();
    shouldThrow = false;
    const button = container.querySelector('button');
    if (button === null) throw new Error('No reset button');
    click(button);
    expect(container.textContent).toContain('Panel works');
    consoleError.mockRestore();
  });

  it('resets by itself when the reset key changes', () => {
    shouldThrow = true;
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    function Harness(): JSX.Element {
      const [key, setKey] = useState(0);
      return (
        <>
          <button type="button" onClick={() => setKey((current) => current + 1)}>
            Change key
          </button>
          <ErrorBoundary fallback={() => <p>Block broke</p>} resetKey={key}>
            <Fragile label="Block" />
          </ErrorBoundary>
        </>
      );
    }
    const { container } = render(<Harness />);
    expect(container.textContent).toContain('Block broke');
    shouldThrow = false;
    const changeKey = container.querySelector('button');
    if (changeKey === null) throw new Error('No key button');
    click(changeKey);
    expect(container.textContent).toContain('Block works');
    consoleError.mockRestore();
  });
});
