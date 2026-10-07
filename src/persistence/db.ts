import type { Project } from '../app/types';
import { parseProjectDocument } from './validateProject';

export type ProjectSummary = { id: string; title: string; updatedAt: string };

export type FileLink = {
  id: string;
  handle: FileSystemFileHandle;
  name: string;
  lastModified: number;
  openedAt: string;
  isAutoSaving: boolean;
};

const DB_NAME = 'visual-editor';
const DB_VERSION = 2;
const PROJECTS = 'projects';
const DOCUMENTS = 'documents';
const FILE_LINKS = 'fileHandles';
const STORE_NAMES = [PROJECTS, DOCUMENTS, FILE_LINKS];

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

function createMissingStores(db: IDBDatabase): void {
  for (const name of STORE_NAMES) {
    if (!db.objectStoreNames.contains(name)) db.createObjectStore(name, { keyPath: 'id' });
  }
}

function closeOnVersionChange(db: IDBDatabase): void {
  db.onversionchange = () => {
    db.close();
    databasePromise = null;
  };
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => createMissingStores(request.result);
    request.onsuccess = () => {
      closeOnVersionChange(request.result);
      resolve(request.result);
    };
    request.onerror = () => reject(request.error);
    request.onblocked = () => {
      console.warn('Browser storage is waiting for other tabs of this app to close');
    };
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

export async function listProjects(): Promise<ProjectSummary[]> {
  const db = await database();
  const projectsStore = db.transaction(PROJECTS).objectStore(PROJECTS);
  const stored: unknown[] = await requestResult(projectsStore.getAll());
  const summaries: ProjectSummary[] = [];
  for (const value of stored) {
    if (isProjectSummary(value)) {
      summaries.push(value);
    } else {
      console.warn('Skipped a stored project summary with an unknown shape', value);
    }
  }
  summaries.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  return summaries;
}

export async function getProject(id: string): Promise<Project | null> {
  const db = await database();
  const documentsStore = db.transaction(DOCUMENTS).objectStore(DOCUMENTS);
  const stored: unknown = await requestResult(documentsStore.get(id));
  if (stored === undefined) return null;
  return parseProjectDocument(stored);
}

export async function getProjectSummary(id: string): Promise<ProjectSummary | null> {
  const db = await database();
  const projectsStore = db.transaction(PROJECTS).objectStore(PROJECTS);
  const stored: unknown = await requestResult(projectsStore.get(id));
  return isProjectSummary(stored) ? stored : null;
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
  const transaction = db.transaction([PROJECTS, DOCUMENTS, FILE_LINKS], 'readwrite');
  transaction.objectStore(PROJECTS).delete(id);
  transaction.objectStore(DOCUMENTS).delete(id);
  transaction.objectStore(FILE_LINKS).delete(id);
  await transactionDone(transaction);
}

function isFileLink(value: unknown): value is FileLink {
  if (typeof value !== 'object' || value === null) return false;
  if (!('id' in value) || !('handle' in value) || !('name' in value)) return false;
  return typeof value.id === 'string' && typeof value.name === 'string';
}

export async function getFileLink(projectId: string): Promise<FileLink | null> {
  const db = await database();
  const store = db.transaction(FILE_LINKS).objectStore(FILE_LINKS);
  const stored: unknown = await requestResult(store.get(projectId));
  return isFileLink(stored) ? stored : null;
}

export async function listFileLinks(): Promise<FileLink[]> {
  const db = await database();
  const store = db.transaction(FILE_LINKS).objectStore(FILE_LINKS);
  const stored: unknown[] = await requestResult(store.getAll());
  const links: FileLink[] = [];
  for (const value of stored) {
    if (isFileLink(value)) links.push(value);
  }
  links.sort((left, right) => right.openedAt.localeCompare(left.openedAt));
  return links;
}

export async function putFileLink(link: FileLink): Promise<void> {
  const db = await database();
  const transaction = db.transaction(FILE_LINKS, 'readwrite');
  transaction.objectStore(FILE_LINKS).put(link);
  await transactionDone(transaction);
}

export async function deleteFileLink(projectId: string): Promise<void> {
  const db = await database();
  const transaction = db.transaction(FILE_LINKS, 'readwrite');
  transaction.objectStore(FILE_LINKS).delete(projectId);
  await transactionDone(transaction);
}
