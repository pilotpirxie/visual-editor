import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { acquireProjectLock, isProjectOpenElsewhere, waitForProjectLock } from './projectLocks';

type Waiter = { grant(): void };

function createFakeLocks() {
  const heldNames = new Set<string>();
  const waiters = new Map<string, Waiter[]>();

  function release(name: string): void {
    heldNames.delete(name);
    const next = waiters.get(name)?.shift();
    next?.grant();
  }

  async function hold(name: string, callback: LockGrantedCallback<unknown>): Promise<unknown> {
    heldNames.add(name);
    try {
      return await callback({ name, mode: 'exclusive' });
    } finally {
      release(name);
    }
  }

  return {
    heldNames,
    async request(name: string, options: LockOptions, callback: LockGrantedCallback<unknown>) {
      if (!heldNames.has(name)) return hold(name, callback);
      if (options.ifAvailable === true) return callback(null);
      return new Promise((resolve, reject) => {
        const queue = waiters.get(name) ?? [];
        queue.push({ grant: () => resolve(hold(name, callback)) });
        waiters.set(name, queue);
        options.signal?.addEventListener('abort', () => reject(new DOMException('', 'AbortError')));
      });
    },
    async query(): Promise<LockManagerSnapshot> {
      return { held: [...heldNames].map((name) => ({ name, mode: 'exclusive' })) };
    },
  };
}

function holdElsewhere(locks: ReturnType<typeof createFakeLocks>, projectId: string): () => void {
  let releaseOther = () => {};
  void locks.request(`visual-editor-project:${projectId}`, {}, () => {
    return new Promise<void>((resolve) => {
      releaseOther = resolve;
    });
  });
  return () => releaseOther();
}

function nextTask(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve));
}

let locks: ReturnType<typeof createFakeLocks>;

beforeEach(() => {
  locks = createFakeLocks();
  Object.defineProperty(navigator, 'locks', { value: locks, configurable: true });
});

afterEach(() => {
  Reflect.deleteProperty(navigator, 'locks');
});

describe('acquireProjectLock', () => {
  it('lets the same tab open a project twice at once, as StrictMode does', async () => {
    const [first, second] = await Promise.all([acquireProjectLock('p1'), acquireProjectLock('p1')]);
    expect(first).not.toBeNull();
    expect(second).not.toBeNull();
    first?.release();
    await nextTask();
    expect(locks.heldNames.has('visual-editor-project:p1')).toBe(true);
    second?.release();
    await nextTask();
    expect(locks.heldNames.has('visual-editor-project:p1')).toBe(false);
  });

  it('keeps the lock when the project is opened again right after closing', async () => {
    const first = await acquireProjectLock('p2');
    first?.release();
    const second = await acquireProjectLock('p2');
    await nextTask();
    expect(second).not.toBeNull();
    expect(locks.heldNames.has('visual-editor-project:p2')).toBe(true);
    second?.release();
    await nextTask();
  });

  it('returns null while another tab has the project open', async () => {
    const releaseOther = holdElsewhere(locks, 'p3');
    expect(await acquireProjectLock('p3')).toBeNull();
    expect(await isProjectOpenElsewhere('p3')).toBe(true);
    releaseOther();
    await nextTask();
    expect(await isProjectOpenElsewhere('p3')).toBe(false);
  });

  it('is always editable when the browser has no Web Locks', async () => {
    Reflect.deleteProperty(navigator, 'locks');
    const lock = await acquireProjectLock('p4');
    expect(lock).not.toBeNull();
    expect(await isProjectOpenElsewhere('p4')).toBe(false);
  });
});

describe('waitForProjectLock', () => {
  it('resolves once the other tab closes the project', async () => {
    const releaseOther = holdElsewhere(locks, 'p5');
    const waiting = waitForProjectLock('p5', new AbortController().signal);
    releaseOther();
    const lock = await waiting;
    expect(locks.heldNames.has('visual-editor-project:p5')).toBe(true);
    expect(await isProjectOpenElsewhere('p5')).toBe(false);
    lock.release();
    await nextTask();
    expect(locks.heldNames.has('visual-editor-project:p5')).toBe(false);
  });

  it('stops waiting when aborted', async () => {
    const releaseOther = holdElsewhere(locks, 'p6');
    const controller = new AbortController();
    const waiting = waitForProjectLock('p6', controller.signal);
    controller.abort();
    await expect(waiting).rejects.toThrow();
    releaseOther();
  });
});
