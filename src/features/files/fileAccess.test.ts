import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  canUseFileSystemAccess,
  hasPermission,
  pickProjectFile,
  pickSaveHandle,
  readHandle,
  writeFile,
  type PickedFile,
} from './fileAccess';

type FakeFileHandle = {
  handle: FileSystemFileHandle;
  writtenContents: string[];
  closeCount(): number;
};

type FakeChosenFile = { name: string; lastModified: number; text(): Promise<string> };

function fakeFileHandle(name: string, text: string, lastModified: number): FakeFileHandle {
  const writtenContents: string[] = [];
  let closes = 0;
  let modifiedAt = lastModified;
  const writable = Object.assign(new WritableStream(), {
    write: async (contents: FileSystemWriteChunkType): Promise<void> => {
      if (typeof contents === 'string') writtenContents.push(contents);
    },
    close: async (): Promise<void> => {
      closes += 1;
      modifiedAt += 1;
    },
    seek: async (): Promise<void> => {},
    truncate: async (): Promise<void> => {},
  });
  const handle: FileSystemFileHandle = {
    kind: 'file',
    name,
    isSameEntry: async () => false,
    getFile: async () => new File([text], name, { lastModified: modifiedAt }),
    createWritable: async () => writable,
  };
  return { handle, writtenContents, closeCount: () => closes };
}

function abortError(): DOMException {
  return new DOMException('The user closed the picker', 'AbortError');
}

function permissionHandle(
  queried: PermissionState,
  requested: PermissionState | null,
): FileSystemHandle {
  const handle: FileSystemHandle = {
    kind: 'file',
    name: 'site.json',
    isSameEntry: async () => false,
    queryPermission: vi.fn(async (): Promise<PermissionState> => queried),
  };
  if (requested !== null) {
    handle.requestPermission = vi.fn(async (): Promise<PermissionState> => requested);
  }
  return handle;
}

function captureFileInput(): () => HTMLInputElement {
  const openedInputs: HTMLInputElement[] = [];
  vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(function click(
    this: HTMLInputElement,
  ): void {
    openedInputs.push(this);
  });
  return () => {
    const input = openedInputs[0];
    if (input === undefined) throw new Error('No file input was opened');
    return input;
  };
}

function chooseFiles(input: HTMLInputElement, files: FakeChosenFile[]): void {
  Object.defineProperty(input, 'files', { value: files, configurable: true });
  input.dispatchEvent(new Event('change'));
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('canUseFileSystemAccess', () => {
  it('is false when the browser has no file pickers', () => {
    expect(canUseFileSystemAccess()).toBe(false);
  });

  it('is false when only the open picker exists', () => {
    vi.stubGlobal('showOpenFilePicker', vi.fn());
    expect(canUseFileSystemAccess()).toBe(false);
  });

  it('is true when both the open and the save pickers exist', () => {
    vi.stubGlobal('showOpenFilePicker', vi.fn());
    vi.stubGlobal('showSaveFilePicker', vi.fn());
    expect(canUseFileSystemAccess()).toBe(true);
  });
});

describe('readHandle', () => {
  it('reads the text, name and modified time of the file behind a handle', async () => {
    const { handle } = fakeFileHandle('site.json', '{"a":1}', 1234);
    expect(await readHandle(handle)).toEqual({
      text: '{"a":1}',
      name: 'site.json',
      lastModified: 1234,
      handle,
    });
  });
});

describe('pickProjectFile with the file picker', () => {
  it('opens the picked project file and keeps its handle', async () => {
    const { handle } = fakeFileHandle('site.json', '{"title":"Fieldnote"}', 99);
    const picker = vi.fn(async () => [handle]);
    vi.stubGlobal('showOpenFilePicker', picker);
    const picked = await pickProjectFile();
    expect(picked).toEqual({
      text: '{"title":"Fieldnote"}',
      name: 'site.json',
      lastModified: 99,
      handle,
    });
    expect(picker).toHaveBeenCalledWith({
      id: 'visual-editor-projects',
      types: [{ description: 'Project file', accept: { 'application/json': ['.json'] } }],
    });
  });

  it('returns null when the user closes the picker', async () => {
    vi.stubGlobal(
      'showOpenFilePicker',
      vi.fn(async () => {
        throw abortError();
      }),
    );
    expect(await pickProjectFile()).toBeNull();
  });

  it('returns null when the picker returns no file', async () => {
    vi.stubGlobal(
      'showOpenFilePicker',
      vi.fn(async () => []),
    );
    expect(await pickProjectFile()).toBeNull();
  });

  it('passes on picker failures other than closing it', async () => {
    vi.stubGlobal(
      'showOpenFilePicker',
      vi.fn(async () => {
        throw new DOMException('Blocked by policy', 'SecurityError');
      }),
    );
    await expect(pickProjectFile()).rejects.toThrow('Blocked by policy');
  });
});

describe('pickProjectFile with the file input fallback', () => {
  it('opens a file input that accepts project files', async () => {
    const openedInput = captureFileInput();
    const picking = pickProjectFile();
    const input = openedInput();
    expect(input.type).toBe('file');
    expect(input.accept).toBe('.json,application/json');
    input.dispatchEvent(new Event('cancel'));
    await picking;
  });

  it('reads the chosen file without a handle', async () => {
    const openedInput = captureFileInput();
    const picking = pickProjectFile();
    const chosen = new File(['{"title":"Fieldnote"}'], 'site.json', { lastModified: 77 });
    chooseFiles(openedInput(), [chosen]);
    const expected: PickedFile = {
      text: '{"title":"Fieldnote"}',
      name: 'site.json',
      lastModified: 77,
      handle: null,
    };
    expect(await picking).toEqual(expected);
  });

  it('returns null when the input changes without a file', async () => {
    const openedInput = captureFileInput();
    const picking = pickProjectFile();
    chooseFiles(openedInput(), []);
    expect(await picking).toBeNull();
  });

  it('returns null when the user cancels the file dialog', async () => {
    const openedInput = captureFileInput();
    const picking = pickProjectFile();
    openedInput().dispatchEvent(new Event('cancel'));
    expect(await picking).toBeNull();
  });

  it('rejects when the chosen file cannot be read', async () => {
    const openedInput = captureFileInput();
    const picking = pickProjectFile();
    const unreadable: FakeChosenFile = {
      name: 'site.json',
      lastModified: 1,
      text: async () => {
        throw new Error('The file was moved');
      },
    };
    chooseFiles(openedInput(), [unreadable]);
    await expect(picking).rejects.toThrow('The file was moved');
  });
});

describe('pickSaveHandle', () => {
  it('asks for a file with the suggested name', async () => {
    const { handle } = fakeFileHandle('fieldnote.json', '', 1);
    const picker = vi.fn(async () => handle);
    vi.stubGlobal('showSaveFilePicker', picker);
    expect(await pickSaveHandle('fieldnote.json')).toBe(handle);
    expect(picker).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'visual-editor-projects', suggestedName: 'fieldnote.json' }),
    );
  });

  it('returns null when the user closes the save picker', async () => {
    vi.stubGlobal(
      'showSaveFilePicker',
      vi.fn(async () => {
        throw abortError();
      }),
    );
    expect(await pickSaveHandle('fieldnote.json')).toBeNull();
  });

  it('passes on save picker failures other than closing it', async () => {
    vi.stubGlobal(
      'showSaveFilePicker',
      vi.fn(async () => {
        throw new Error('Disk is full');
      }),
    );
    await expect(pickSaveHandle('fieldnote.json')).rejects.toThrow('Disk is full');
  });

  it('throws when the browser cannot save to a chosen file', async () => {
    await expect(pickSaveHandle('fieldnote.json')).rejects.toThrow(
      'This browser cannot save to a chosen file',
    );
  });
});

describe('writeFile', () => {
  it('writes the contents, closes the file and returns its new modified time', async () => {
    const fake = fakeFileHandle('site.json', '', 500);
    const lastModified = await writeFile(fake.handle, '{"saved":true}');
    expect(fake.writtenContents).toEqual(['{"saved":true}']);
    expect(fake.closeCount()).toBe(1);
    expect(lastModified).toBe(501);
  });

  it('rejects when the file cannot be opened for writing', async () => {
    const { handle } = fakeFileHandle('site.json', '', 500);
    handle.createWritable = async () => {
      throw new DOMException('Permission was revoked', 'NotAllowedError');
    };
    await expect(writeFile(handle, '{}')).rejects.toThrow('Permission was revoked');
  });
});

describe('hasPermission', () => {
  it('allows handles from browsers without permission queries', async () => {
    const { handle } = fakeFileHandle('site.json', '', 1);
    expect(await hasPermission(handle, 'readwrite', false)).toBe(true);
  });

  it('allows access that is already granted without asking', async () => {
    const handle = permissionHandle('granted', 'denied');
    expect(await hasPermission(handle, 'read', true)).toBe(true);
    expect(handle.queryPermission).toHaveBeenCalledWith({ mode: 'read' });
    expect(handle.requestPermission).not.toHaveBeenCalled();
  });

  it('does not ask the user when asking is not allowed', async () => {
    const handle = permissionHandle('prompt', 'granted');
    expect(await hasPermission(handle, 'readwrite', false)).toBe(false);
    expect(handle.requestPermission).not.toHaveBeenCalled();
  });

  it('asks the user for the mode it needs when asking is allowed', async () => {
    const handle = permissionHandle('prompt', 'granted');
    expect(await hasPermission(handle, 'readwrite', true)).toBe(true);
    expect(handle.requestPermission).toHaveBeenCalledWith({ mode: 'readwrite' });
  });

  it('refuses when the user denies the request', async () => {
    const handle = permissionHandle('prompt', 'denied');
    expect(await hasPermission(handle, 'read', true)).toBe(false);
  });

  it('refuses when the browser cannot ask for permission', async () => {
    const handle = permissionHandle('prompt', null);
    expect(await hasPermission(handle, 'read', true)).toBe(false);
  });
});
