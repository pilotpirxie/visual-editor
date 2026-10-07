type FilePickerAcceptType = { description?: string; accept: Record<string, string[]> };

type OpenFilePickerOptions = {
  id?: string;
  types?: FilePickerAcceptType[];
  excludeAcceptAllOption?: boolean;
  multiple?: boolean;
};

type SaveFilePickerOptions = {
  id?: string;
  types?: FilePickerAcceptType[];
  suggestedName?: string;
};

type DirectoryPickerOptions = { id?: string; mode?: FileSystemPermissionMode };

type FileSystemPermissionMode = 'read' | 'readwrite';

type FileSystemPermissionDescriptor = { mode?: FileSystemPermissionMode };

interface Window {
  showOpenFilePicker?(options?: OpenFilePickerOptions): Promise<FileSystemFileHandle[]>;
  showSaveFilePicker?(options?: SaveFilePickerOptions): Promise<FileSystemFileHandle>;
  showDirectoryPicker?(options?: DirectoryPickerOptions): Promise<FileSystemDirectoryHandle>;
}

interface FileSystemHandle {
  queryPermission?(descriptor?: FileSystemPermissionDescriptor): Promise<PermissionState>;
  requestPermission?(descriptor?: FileSystemPermissionDescriptor): Promise<PermissionState>;
}
