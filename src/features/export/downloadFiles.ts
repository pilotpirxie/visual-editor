const MIME_TYPES: Record<string, string> = {
  html: 'text/html',
  css: 'text/css',
  js: 'text/javascript',
};

const DOWNLOAD_SPACING_MS = 150;
const REVOKE_DELAY_MS = 10_000;
const FALLBACK_MIME_TYPE = 'text/plain';

function mimeTypeOf(fileName: string): string {
  const extension = fileName.slice(fileName.lastIndexOf('.') + 1);
  const mimeType = MIME_TYPES[extension] ?? FALLBACK_MIME_TYPE;
  return `${mimeType};charset=utf-8`;
}

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export async function downloadFiles(files: Record<string, string | Blob>): Promise<void> {
  for (const [name, content] of Object.entries(files)) {
    const blob =
      content instanceof Blob ? content : new Blob([content], { type: mimeTypeOf(name) });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), REVOKE_DELAY_MS);
    await wait(DOWNLOAD_SPACING_MS);
  }
}
