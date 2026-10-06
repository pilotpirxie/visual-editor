import type { Project } from '../app/types';

export type ProjectSummary = { id: string; title: string; updatedAt: string };

const DB_NAME = 'visual-editor';
const DB_VERSION = 1;
const PROJECTS = 'projects';
const DOCUMENTS = 'documents';
const SUPPORTED_SCHEMA_VERSION = 1;

let databasePromise: Promise<IDBDatabase> | null = null;

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () =>
      reject(transaction.error ?? new Error('IndexedDB transaction was aborted'));
  });
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(PROJECTS, { keyPath: 'id' });
      request.result.createObjectStore(DOCUMENTS, { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('Close other tabs of this app and reload'));
  });
}

async function database(): Promise<IDBDatabase> {
  databasePromise ??= openDatabase();
  try {
    return await databasePromise;
  } catch (error) {
    databasePromise = null;
    throw new Error('Could not open browser storage', { cause: error });
  }
}

function isProjectSummary(value: unknown): value is ProjectSummary {
  if (typeof value !== 'object' || value === null) return false;
  if (!('id' in value) || !('title' in value) || !('updatedAt' in value)) return false;
  return (
    typeof value.id === 'string' &&
    typeof value.title === 'string' &&
    typeof value.updatedAt === 'string'
  );
}

function isProject(value: unknown): value is Project {
  if (typeof value !== 'object' || value === null) return false;
  if (!('schemaVersion' in value) || value.schemaVersion !== SUPPORTED_SCHEMA_VERSION) return false;
  return (
    'id' in value &&
    typeof value.id === 'string' &&
    'settings' in value &&
    'designSystem' in value &&
    'pages' in value &&
    'blocks' in value
  );
}

export async function listProjects(): Promise<ProjectSummary[]> {
  const db = await database();
  const stored: unknown[] = await requestResult(
    db.transaction(PROJECTS).objectStore(PROJECTS).getAll(),
  );
  const summaries: ProjectSummary[] = [];
  for (const value of stored) {
    if (isProjectSummary(value)) summaries.push(value);
    else console.warn('Skipped a stored project summary with an unknown shape', value);
  }
  return summaries.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getProject(id: string): Promise<Project | null> {
  const db = await database();
  const stored: unknown = await requestResult(
    db.transaction(DOCUMENTS).objectStore(DOCUMENTS).get(id),
  );
  if (stored === undefined) return null;
  if (!isProject(stored)) throw new Error(`Project ${id} was saved in an unsupported format`);
  return stored;
}

export async function putProject(project: Project): Promise<void> {
  const db = await database();
  const summary: ProjectSummary = {
    id: project.id,
    title: project.settings.title,
    updatedAt: new Date().toISOString(),
  };
  const transaction = db.transaction([PROJECTS, DOCUMENTS], 'readwrite');
  transaction.objectStore(PROJECTS).put(summary);
  transaction.objectStore(DOCUMENTS).put(project);
  await transactionDone(transaction);
}

export async function deleteProject(id: string): Promise<void> {
  const db = await database();
  const transaction = db.transaction([PROJECTS, DOCUMENTS], 'readwrite');
  transaction.objectStore(PROJECTS).delete(id);
  transaction.objectStore(DOCUMENTS).delete(id);
  await transactionDone(transaction);
}
