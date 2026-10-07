export type ProjectLock = { release(): void };

type LockGrant = () => void;

type HeldLock = {
  count: number;
  grant: Promise<LockGrant | null>;
  releaseTimer: ReturnType<typeof setTimeout> | null;
};

type LockRequester = {
  request(
    name: string,
    options: LockOptions,
    callback: LockGrantedCallback<unknown>,
  ): Promise<unknown>;
  query(): Promise<LockManagerSnapshot>;
};

const LOCK_PREFIX = 'visual-editor-project:';
const ALWAYS_EDITABLE: ProjectLock = { release() {} };

const heldLocks = new Map<string, HeldLock>();

function lockManager(): LockRequester | null {
  if (typeof navigator === 'undefined' || !('locks' in navigator)) return null;
  return navigator.locks;
}

function lockName(projectId: string): string {
  return `${LOCK_PREFIX}${projectId}`;
}

function requestLock(
  locks: LockRequester,
  projectId: string,
  options: LockOptions,
): Promise<LockGrant | null> {
  return new Promise((resolve, reject) => {
    locks
      .request(lockName(projectId), options, (lock) => {
        if (lock === null) {
          resolve(null);
          return null;
        }
        return new Promise<void>((releaseLock) => resolve(releaseLock));
      })
      .catch(reject);
  });
}

function releaseOne(projectId: string, held: HeldLock): void {
  held.count -= 1;
  if (held.count > 0) return;
  held.releaseTimer = setTimeout(() => {
    if (held.count > 0 || heldLocks.get(projectId) !== held) return;
    heldLocks.delete(projectId);
    void held.grant.then((grant) => grant?.());
  });
}

function handleFor(projectId: string, held: HeldLock): ProjectLock {
  let isReleased = false;
  return {
    release() {
      if (isReleased) return;
      isReleased = true;
      releaseOne(projectId, held);
    },
  };
}

async function joinLock(projectId: string, held: HeldLock): Promise<ProjectLock | null> {
  held.count += 1;
  if (held.releaseTimer !== null) {
    clearTimeout(held.releaseTimer);
    held.releaseTimer = null;
  }
  const grant = await held.grant;
  if (grant !== null) return handleFor(projectId, held);
  held.count -= 1;
  if (held.count === 0 && heldLocks.get(projectId) === held) heldLocks.delete(projectId);
  return null;
}

export function acquireProjectLock(projectId: string): Promise<ProjectLock | null> {
  const locks = lockManager();
  if (locks === null) return Promise.resolve(ALWAYS_EDITABLE);
  let held = heldLocks.get(projectId);
  if (held === undefined) {
    held = {
      count: 0,
      grant: requestLock(locks, projectId, { ifAvailable: true }),
      releaseTimer: null,
    };
    heldLocks.set(projectId, held);
  }
  return joinLock(projectId, held);
}

export async function waitForProjectLock(
  projectId: string,
  signal: AbortSignal,
): Promise<ProjectLock> {
  const locks = lockManager();
  if (locks === null) return ALWAYS_EDITABLE;
  const grant = requestLock(locks, projectId, { signal });
  const held: HeldLock = { count: 0, grant, releaseTimer: null };
  const releaseLock = await grant;
  if (releaseLock === null) throw new Error(`The lock for project ${projectId} was not granted`);
  heldLocks.set(projectId, held);
  held.count = 1;
  return handleFor(projectId, held);
}

export async function isProjectOpenElsewhere(projectId: string): Promise<boolean> {
  const locks = lockManager();
  if (locks === null || heldLocks.has(projectId)) return false;
  const snapshot = await locks.query();
  const name = lockName(projectId);
  for (const lock of snapshot.held ?? []) {
    if (lock.name === name) return true;
  }
  return false;
}
