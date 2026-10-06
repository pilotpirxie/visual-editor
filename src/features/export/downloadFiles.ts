const MIME_TYPES: Record<string, string> = {
  html: 'text/html',
  css: 'text/css',
  js: 'text/javascript',
};

const DOWNLOAD_SPACING_MS = 150;
const REVOKE_DELAY_MS = 10_000;

export async function downloadFiles(files: Record<string, string>): Promise<void> {
  for (const [name, content] of Object.entries(files)) {
    const extension = name.slice(name.lastIndexOf('.') + 1);
    const type = `${MIME_TYPES[extension] ?? 'text/plain'};charset=utf-8`;
    const url = URL.createObjectURL(new Blob([content], { type }));
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), REVOKE_DELAY_MS);
    await new Promise((resolve) => setTimeout(resolve, DOWNLOAD_SPACING_MS));
  }
}
