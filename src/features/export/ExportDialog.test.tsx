import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSampleProject } from '../../app/projectFactory';
import { noticeDismissed } from '../../app/editorSlice';
import { dispatch, store } from '../../app/store';
import type { ButtonValue } from '../../components/types';
import type { Project } from '../../app/types';
import { click, getButton, queryButton, render } from '../../test/dom';
import {
  componentBlockOf,
  homePage,
  loadIntoAppStore,
  shareNavAndFooter,
  withSearchDetails,
} from '../../test/fixtures';
import { ensureProjectIconSets } from '../icons/ensureIconSets';
import { downloadBlob } from './download';
import { ExportDialog, exportFileName, formatBytes } from './ExportDialog';

vi.mock('./download', () => ({ downloadBlob: vi.fn() }));

vi.mock('../../persistence/db', () => ({
  putProject: vi.fn(async () => {}),
  getProject: vi.fn(async () => null),
  listProjects: vi.fn(async () => []),
  deleteProject: vi.fn(async () => {}),
}));

vi.mock(import('../icons/ensureIconSets'), async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, ensureProjectIconSets: vi.fn(actual.ensureProjectIconSets) };
});

type WrittenFiles = Map<string, string | Blob>;

type FakeFolder = {
  name: string;
  getDirectoryHandle(name: string): Promise<FakeFolder>;
  getFileHandle(name: string): Promise<{ createWritable(): Promise<FakeWritable> }>;
};

type FakeWritable = { write(data: string | Blob): Promise<void>; close(): Promise<void> };

function fakeFolder(name: string, written: WrittenFiles, prefix = ''): FakeFolder {
  return {
    name,
    async getDirectoryHandle(child) {
      return fakeFolder(child, written, `${prefix}${child}/`);
    },
    async getFileHandle(fileName) {
      return {
        async createWritable() {
          return {
            async write(data) {
              written.set(`${prefix}${fileName}`, data);
            },
            async close() {},
          };
        },
      };
    },
  };
}

function setDirectoryPicker(picker: (() => Promise<unknown>) | undefined): void {
  Object.defineProperty(window, 'showDirectoryPicker', {
    value: picker,
    configurable: true,
    writable: true,
  });
}

function heroIdOf(project: Project): string {
  for (const blockId of homePage(project).blockIds) {
    if (componentBlockOf(project, blockId).componentId === 'hero-centered') return blockId;
  }
  throw new Error('The sample page has no hero');
}

async function renderReady(onClose: () => void = () => {}): Promise<HTMLDivElement> {
  const { container } = render(<ExportDialog onClose={onClose} />);
  await vi.waitFor(() => {
    if (container.textContent?.includes('Preparing your files')) throw new Error('Still preparing');
  });
  return container;
}

function isDialogOpen(container: HTMLElement): boolean {
  return container.querySelector('dialog')?.hasAttribute('open') === true;
}

function noticeTexts(): string[] {
  const texts: string[] = [];
  for (const notice of store.getState().editor.notices) texts.push(notice.text);
  return texts;
}

beforeEach(() => {
  for (const notice of store.getState().editor.notices) dispatch(noticeDismissed(notice.id));
  loadIntoAppStore(withSearchDetails(createSampleProject()));
  setDirectoryPicker(undefined);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('formatBytes', () => {
  it('shows bytes below one kilobyte', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(1023)).toBe('1023 B');
  });

  it('shows kilobytes with one decimal from 1024 bytes up', () => {
    expect(formatBytes(1024)).toBe('1.0 KB');
    expect(formatBytes(1536)).toBe('1.5 KB');
  });
});

describe('exportFileName', () => {
  it('names the zip after the site title and the date with padded month and day', () => {
    expect(exportFileName('Acme Site', new Date(2026, 0, 5))).toBe('acme-site-2026-01-05.zip');
  });

  it('keeps two-digit months and days as they are', () => {
    expect(exportFileName('Acme', new Date(2026, 11, 31))).toBe('acme-2026-12-31.zip');
  });

  it('falls back to a generic name when the title has no letters or digits', () => {
    expect(exportFileName('!!!', new Date(2026, 9, 7))).toBe('page-2026-10-07.zip');
  });
});

describe('ExportDialog', () => {
  it('shows that it is preparing the files before they are ready', async () => {
    const { container } = render(<ExportDialog onClose={() => {}} />);
    expect(container.textContent).toContain('Preparing your files…');
    await vi.waitFor(() => expect(getButton(container, 'Download zip')).toBeDefined());
  });

  it('offers a plain download when nothing needs checking', async () => {
    const container = await renderReady();
    expect(container.textContent).toContain('Everything looks ready.');
    expect(container.querySelector('[role="note"]')).toBeNull();
    expect(queryButton(container, 'Export anyway')).toBeNull();
  });

  it('lists the files that will be written with their total size', async () => {
    const container = await renderReady();
    const summary = container.querySelector('.ve-export-files summary')?.textContent ?? '';
    expect(summary).toMatch(/^\d+ files, \d+(\.\d)? (B|KB)$/);
    const listed: string[] = [];
    for (const item of container.querySelectorAll('.ve-export-files li > span:first-child')) {
      listed.push(item.textContent ?? '');
    }
    expect(listed).toContain('index.html');
    expect(listed).toContain('assets/css/site.css');
  });

  it('lists warnings with the page name and asks to export anyway', async () => {
    const project = createSampleProject();
    componentBlockOf(project, heroIdOf(project)).values.title = '';
    loadIntoAppStore(project);
    const container = await renderReady();
    const warnings = container.querySelector('[role="note"]')?.textContent ?? '';
    expect(warnings).toContain('Home: Hero, centered text: “Title” is required but empty.');
    expect(getButton(container, 'Export anyway')).toBeDefined();
    expect(queryButton(container, 'Download zip')).toBeNull();
  });

  it('names shared blocks as the place of their warnings', async () => {
    const { navId } = shareNavAndFooter();
    const nav = componentBlockOf(store.getState().project, navId);
    const cta: ButtonValue = {
      label: 'Start free trial',
      link: { type: 'page', pageId: 'deleted-page', newTab: false },
      variant: 'primary',
    };
    loadIntoAppStore({
      ...store.getState().project,
      blocks: {
        ...store.getState().project.blocks,
        entities: {
          ...store.getState().project.blocks.entities,
          [navId]: { ...nav, values: { ...nav.values, cta } },
        },
      },
    });
    const container = await renderReady();
    expect(container.querySelector('[role="note"]')?.textContent).toContain(
      'Shared blocks: Navigation, logo left: “Button” links to a page that was deleted.',
    );
  });

  it('downloads a zip named after the site and the day, then closes', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 7, 12, 0));
    const onClose = vi.fn();
    const container = await renderReady(onClose);
    click(getButton(container, 'Download zip'));
    await vi.waitFor(() => expect(downloadBlob).toHaveBeenCalledTimes(1));
    const [zip, fileName] = vi.mocked(downloadBlob).mock.calls[0];
    expect(fileName).toBe('fieldnote-2026-10-07.zip');
    expect(zip.type).toBe('application/zip');
    expect(zip.size).toBeGreaterThan(0);
    await vi.waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(isDialogOpen(container)).toBe(false);
  });

  it('keeps the dialog open and shows a notice when the download fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(downloadBlob).mockImplementationOnce(() => {
      throw new Error('Disk full');
    });
    const onClose = vi.fn();
    const container = await renderReady(onClose);
    click(getButton(container, 'Download zip'));
    await vi.waitFor(() => expect(noticeTexts()).toContain('Export failed: Disk full'));
    expect(onClose).not.toHaveBeenCalled();
    expect(isDialogOpen(container)).toBe(true);
    expect(getButton(container, 'Download zip').disabled).toBe(false);
  });

  it('explains when the files cannot be prepared and offers no export', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(ensureProjectIconSets).mockRejectedValueOnce(new Error('Icons are offline'));
    const container = await renderReady();
    expect(container.querySelector('[role="alert"]')?.textContent).toBe(
      'The site could not be exported: Icons are offline',
    );
    expect(queryButton(container, 'Download zip')).toBeNull();
    expect(queryButton(container, 'Save to folder…')).toBeNull();
  });

  it('closes without exporting on Cancel', async () => {
    const onClose = vi.fn();
    const container = await renderReady(onClose);
    click(getButton(container, 'Cancel'));
    expect(onClose).toHaveBeenCalled();
    expect(downloadBlob).not.toHaveBeenCalled();
  });
});

describe('ExportDialog saving into a folder', () => {
  it('hides the folder option when the browser cannot write into folders', async () => {
    const container = await renderReady();
    expect(queryButton(container, 'Save to folder…')).toBeNull();
  });

  it('writes every file into the chosen folder, reports it and closes', async () => {
    const written: WrittenFiles = new Map();
    setDirectoryPicker(async () => fakeFolder('my-site', written));
    const onClose = vi.fn();
    const container = await renderReady(onClose);
    click(getButton(container, 'Save to folder…'));
    await vi.waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(written.has('index.html')).toBe(true);
    expect(written.has('assets/css/site.css')).toBe(true);
    expect(noticeTexts()).toContain(`Exported ${written.size} files to my-site.`);
    expect(downloadBlob).not.toHaveBeenCalled();
  });

  it('stays open when the user cancels the folder picker', async () => {
    setDirectoryPicker(async () => {
      throw new DOMException('The user aborted a request.', 'AbortError');
    });
    const onClose = vi.fn();
    const container = await renderReady(onClose);
    click(getButton(container, 'Save to folder…'));
    await vi.waitFor(() => expect(getButton(container, 'Save to folder…').disabled).toBe(false));
    expect(onClose).not.toHaveBeenCalled();
    expect(isDialogOpen(container)).toBe(true);
    expect(noticeTexts()).toEqual([]);
  });

  it('shows a notice when the folder cannot be written', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    setDirectoryPicker(async () => {
      throw new DOMException('Permission denied', 'NotAllowedError');
    });
    const onClose = vi.fn();
    const container = await renderReady(onClose);
    click(getButton(container, 'Save to folder…'));
    await vi.waitFor(() => expect(noticeTexts().join('\n')).toContain('Permission denied'));
    expect(onClose).not.toHaveBeenCalled();
  });
});
