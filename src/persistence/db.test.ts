import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type FakeRequest = {
  result: unknown;
  error: null;
  onsuccess: (() => void) | null;
  onerror: (() => void) | null;
  onupgradeneeded: (() => void) | null;
  onblocked: (() => void) | null;
};

type FakeConnection = {
  onclose: (() => void) | null;
  onversionchange: (() => void) | null;
  close(): void;
  transaction(): { objectStore(): { get(): FakeRequest } };
};

function succeedingRequest(result: unknown): FakeRequest {
  const request: FakeRequest = {
    result,
    error: null,
    onsuccess: null,
    onerror: null,
    onupgradeneeded: null,
    onblocked: null,
  };
  queueMicrotask(() => request.onsuccess?.());
  return request;
}

function createConnection(): FakeConnection {
  return {
    onclose: null,
    onversionchange: null,
    close() {},
    transaction: () => ({ objectStore: () => ({ get: () => succeedingRequest(undefined) }) }),
  };
}

function stubStorage(): { connections: FakeConnection[]; open: () => FakeRequest } {
  const connections: FakeConnection[] = [];
  const open = vi.fn(() => {
    const connection = createConnection();
    connections.push(connection);
    return succeedingRequest(connection);
  });
  vi.stubGlobal('indexedDB', { open });
  return { connections, open };
}

describe('browser storage connection', () => {
  beforeEach(() => vi.resetModules());
  afterEach(() => vi.unstubAllGlobals());

  it('opens browser storage once and reuses the connection', async () => {
    const { open } = stubStorage();
    const { getProjectSummary } = await import('./db');
    await getProjectSummary('project');
    await getProjectSummary('project');
    expect(open).toHaveBeenCalledTimes(1);
  });

  it('opens browser storage again after the browser closes the connection', async () => {
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { connections, open } = stubStorage();
    const { getProjectSummary } = await import('./db');
    await getProjectSummary('project');
    connections[0]?.onclose?.();
    expect(await getProjectSummary('project')).toBeNull();
    expect(open).toHaveBeenCalledTimes(2);
    expect(warning).toHaveBeenCalled();
    warning.mockRestore();
  });

  it('opens browser storage again after another tab asks for a newer version', async () => {
    const { connections, open } = stubStorage();
    const { getProjectSummary } = await import('./db');
    await getProjectSummary('project');
    connections[0]?.onversionchange?.();
    expect(await getProjectSummary('project')).toBeNull();
    expect(open).toHaveBeenCalledTimes(2);
  });
});
