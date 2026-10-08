import type { Project } from '../app/types';
import { parseEmbeddedBlocks, parsePackInfo } from '../components/packFormat';
import type { BlockPack } from '../components/types';
import { isRecord } from '../components/fields';
import { parseProjectDocument } from './validateProject';
import { postTabMessage } from './tabChannel';

export type ProjectSummary = { id: string; title: string; updatedAt: string };

export type SnapshotKind = 'manual' | 'auto';

export type SnapshotSummary = {
  id: string;
  projectId: string;
  name: string;
  kind: SnapshotKind;
  createdAt: string;
};

export type SnapshotRecord = SnapshotSummary & { document: string };

export type SavedBlockRecord = {
  id: string;
  name: string;
  componentId: string | null;
  savedAt: string;
  envelope: string;
};

export type FileLink = {
  id: string;
  handle: FileSystemFileHandle;
  name: string;
  lastModified: number;
  openedAt: string;
  isAutoSaving: boolean;
};

const DB_NAME = 'visual-editor';
const DB_VERSION = 1;
const PROJECTS = 'projects';
const DOCUMENTS = 'documents';
const FILE_LINKS = 'fileHandles';
const BLOCK_PACKS = 'blockPacks';
const SNAPSHOTS = 'snapshots';
const SAVED_BLOCKS = 'savedBlocks';
const STORE_NAMES = [PROJECTS, DOCUMENTS, FILE_LINKS, BLOCK_PACKS, SNAPSHOTS, SAVED_BLOCKS];
const SNAPSHOT_ID_SEPARATOR = '|';
const LAST_KEY_CHARACTER = '\uffff';

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
    throw new Error(
      'Could not open browser storage. A private window or the site settings may block it.',
      { cause: error },
    );
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
  postTabMessage({ kind: 'project-saved', projectId: project.id });
}

export async function deleteProject(id: string): Promise<void> {
  const db = await database();
  const transaction = db.transaction([PROJECTS, DOCUMENTS, FILE_LINKS, SNAPSHOTS], 'readwrite');
  transaction.objectStore(PROJECTS).delete(id);
  transaction.objectStore(DOCUMENTS).delete(id);
  transaction.objectStore(FILE_LINKS).delete(id);
  transaction.objectStore(SNAPSHOTS).delete(snapshotRange(id));
  await transactionDone(transaction);
  postTabMessage({ kind: 'project-deleted', projectId: id });
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

function parseStoredPack(value: unknown): BlockPack | null {
  if (!isRecord(value) || !Array.isArray(value.blocks)) return null;
  const { info } = parsePackInfo(value);
  if (info === null) return null;
  const rawBlocks: Record<string, unknown> = {};
  for (const block of value.blocks) {
    if (isRecord(block) && isRecord(block.definition) && typeof block.definition.id === 'string') {
      rawBlocks[block.definition.id] = block;
    }
  }
  const blocks = Object.values(parseEmbeddedBlocks(rawBlocks));
  if (blocks.length === 0) return null;
  return { ...info, blocks, isPartial: value.isPartial === true };
}

export async function listBlockPacks(): Promise<BlockPack[]> {
  const db = await database();
  const store = db.transaction(BLOCK_PACKS).objectStore(BLOCK_PACKS);
  const stored: unknown[] = await requestResult(store.getAll());
  const packs: BlockPack[] = [];
  for (const value of stored) {
    const pack = parseStoredPack(value);
    if (pack === null) {
      console.warn('Skipped a stored block pack with an unknown shape', value);
      continue;
    }
    packs.push(pack);
  }
  packs.sort((left, right) => left.name.localeCompare(right.name));
  return packs;
}

export async function putBlockPack(pack: BlockPack): Promise<void> {
  const db = await database();
  const transaction = db.transaction(BLOCK_PACKS, 'readwrite');
  transaction.objectStore(BLOCK_PACKS).put(pack);
  await transactionDone(transaction);
}

export async function deleteBlockPack(packId: string): Promise<void> {
  const db = await database();
  const transaction = db.transaction(BLOCK_PACKS, 'readwrite');
  transaction.objectStore(BLOCK_PACKS).delete(packId);
  await transactionDone(transaction);
}

export function snapshotId(projectId: string, createdAt: string, suffix: string): string {
  return [projectId, createdAt, suffix].join(SNAPSHOT_ID_SEPARATOR);
}

function snapshotRange(projectId: string): IDBKeyRange {
  const prefix = `${projectId}${SNAPSHOT_ID_SEPARATOR}`;
  return IDBKeyRange.bound(prefix, `${prefix}${LAST_KEY_CHARACTER}`);
}

function isSnapshotRecord(value: unknown): value is SnapshotRecord {
  if (!isRecord(value)) return false;
  const hasText =
    typeof value.id === 'string' &&
    typeof value.projectId === 'string' &&
    typeof value.name === 'string' &&
    typeof value.createdAt === 'string';
  const hasKind = value.kind === 'manual' || value.kind === 'auto';
  return hasText && hasKind && typeof value.document === 'string';
}

export async function listSnapshots(projectId: string): Promise<SnapshotSummary[]> {
  const db = await database();
  const store = db.transaction(SNAPSHOTS).objectStore(SNAPSHOTS);
  const stored: unknown[] = await requestResult(store.getAll(snapshotRange(projectId)));
  const summaries: SnapshotSummary[] = [];
  for (const value of stored) {
    if (!isSnapshotRecord(value)) {
      console.warn('Skipped a stored snapshot with an unknown shape', value);
      continue;
    }
    const { id, name, kind, createdAt } = value;
    summaries.push({ id, projectId: value.projectId, name, kind, createdAt });
  }
  summaries.reverse();
  return summaries;
}

async function getSnapshotRecord(id: string): Promise<SnapshotRecord | null> {
  const db = await database();
  const store = db.transaction(SNAPSHOTS).objectStore(SNAPSHOTS);
  const stored: unknown = await requestResult(store.get(id));
  return isSnapshotRecord(stored) ? stored : null;
}

export async function getSnapshotProject(id: string): Promise<Project | null> {
  const record = await getSnapshotRecord(id);
  if (record === null) return null;
  let document: unknown;
  try {
    document = JSON.parse(record.document);
  } catch (error) {
    throw new Error(`Snapshot ${id} is not valid JSON`, { cause: error });
  }
  return parseProjectDocument(document);
}

export async function latestSnapshotText(projectId: string): Promise<string | null> {
  const db = await database();
  const store = db.transaction(SNAPSHOTS).objectStore(SNAPSHOTS);
  const cursor = await requestResult(store.openCursor(snapshotRange(projectId), 'prev'));
  if (cursor === null || !isSnapshotRecord(cursor.value)) return null;
  return cursor.value.document;
}

export async function putSnapshot(record: SnapshotRecord, keep: number): Promise<void> {
  const db = await database();
  const transaction = db.transaction(SNAPSHOTS, 'readwrite');
  const store = transaction.objectStore(SNAPSHOTS);
  store.put(record);
  const keys = await requestResult(store.getAllKeys(snapshotRange(record.projectId)));
  const extraCount = keys.length - keep;
  for (let index = 0; index < extraCount; index += 1) {
    const key = keys[index];
    if (key !== undefined) store.delete(key);
  }
  await transactionDone(transaction);
}

export async function deleteSnapshot(id: string): Promise<void> {
  const db = await database();
  const transaction = db.transaction(SNAPSHOTS, 'readwrite');
  transaction.objectStore(SNAPSHOTS).delete(id);
  await transactionDone(transaction);
}

function isSavedBlockRecord(value: unknown): value is SavedBlockRecord {
  if (!isRecord(value)) return false;
  const hasText =
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    typeof value.savedAt === 'string' &&
    typeof value.envelope === 'string';
  const hasComponentId = typeof value.componentId === 'string' || value.componentId === null;
  return hasText && hasComponentId;
}

export async function listSavedBlocks(): Promise<SavedBlockRecord[]> {
  const db = await database();
  const store = db.transaction(SAVED_BLOCKS).objectStore(SAVED_BLOCKS);
  const stored: unknown[] = await requestResult(store.getAll());
  const records: SavedBlockRecord[] = [];
  for (const value of stored) {
    if (!isSavedBlockRecord(value)) {
      console.warn('Skipped a stored saved block with an unknown shape', value);
      continue;
    }
    records.push(value);
  }
  records.sort((left, right) => left.name.localeCompare(right.name));
  return records;
}

export async function putSavedBlock(record: SavedBlockRecord): Promise<void> {
  const db = await database();
  const transaction = db.transaction(SAVED_BLOCKS, 'readwrite');
  transaction.objectStore(SAVED_BLOCKS).put(record);
  await transactionDone(transaction);
  postTabMessage({ kind: 'saved-blocks-changed' });
}

export async function deleteSavedBlock(id: string): Promise<void> {
  const db = await database();
  const transaction = db.transaction(SAVED_BLOCKS, 'readwrite');
  transaction.objectStore(SAVED_BLOCKS).delete(id);
  await transactionDone(transaction);
  postTabMessage({ kind: 'saved-blocks-changed' });
}
