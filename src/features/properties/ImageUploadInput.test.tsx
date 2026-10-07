import { describe, expect, it, vi } from 'vitest';
import type { ImageUpload } from '../../app/projectSlice';
import type { Asset } from '../../app/types';
import { click, getButton, queryButton, render, runInAct } from '../../test/dom';
import { ImageUploadInput, MAX_IMAGE_UPLOAD_BYTES } from './ImageUploadInput';

const PNG_ONLY = ['image/png'];

const FAVICON: Asset = {
  id: 'favicon',
  name: 'favicon.png',
  mimeType: 'image/png',
  dataUrl: 'data:image/png;base64,iVBORw0KGgo=',
};

type Rendered = { container: HTMLDivElement; onChange: ReturnType<typeof vi.fn> };

function renderInput(asset?: Asset): Rendered {
  const onChange = vi.fn<(upload: ImageUpload | null) => void>();
  const { container } = render(
    <ImageUploadInput
      id="project-favicon"
      label="Favicon"
      asset={asset}
      accept={PNG_ONLY}
      typeError="Use a PNG image"
      shape="icon"
      onChange={onChange}
    />,
  );
  return { container, onChange };
}

function fileInput(container: HTMLElement): HTMLInputElement {
  const input = container.querySelector<HTMLInputElement>('input[type="file"]');
  if (input === null) throw new Error('The file input is missing');
  return input;
}

function chooseFile(container: HTMLElement, file: File): void {
  const input = fileInput(container);
  Object.defineProperty(input, 'files', { value: [file], configurable: true });
  runInAct(() => {
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
}

function pngOfSize(bytes: number, name = 'icon.png'): File {
  return new File([new Uint8Array(bytes)], name, { type: 'image/png' });
}

function errorText(container: HTMLElement): string | null {
  return container.querySelector('[role="alert"]')?.textContent ?? null;
}

describe('ImageUploadInput', () => {
  it('offers an upload button and no preview when there is no image yet', () => {
    const { container } = renderInput();
    expect(getButton(container, 'Upload image')).toBeDefined();
    expect(queryButton(container, 'Remove')).toBeNull();
    expect(container.querySelector('img')).toBeNull();
    expect(fileInput(container).accept).toBe('image/png');
  });

  it('previews the current image and offers to replace or remove it', () => {
    const { container } = renderInput(FAVICON);
    expect(container.querySelector('img')?.getAttribute('src')).toBe(FAVICON.dataUrl);
    expect(container.querySelector('img')?.className).toContain('ve-upload-preview--icon');
    expect(getButton(container, 'Replace image')).toBeDefined();
    expect(getButton(container, 'Remove')).toBeDefined();
  });

  it('opens the file chooser from the upload button', () => {
    const { container } = renderInput();
    const openChooser = vi.spyOn(fileInput(container), 'click').mockImplementation(() => {});
    click(getButton(container, 'Upload image'));
    expect(openChooser).toHaveBeenCalledTimes(1);
  });

  it('sends an accepted image as a data URL upload with its name and type', async () => {
    const { container, onChange } = renderInput();
    chooseFile(container, pngOfSize(16, 'logo.png'));
    await vi.waitFor(() => expect(onChange).toHaveBeenCalledTimes(1));
    const upload = onChange.mock.calls[0][0];
    expect(upload).toMatchObject({ name: 'logo.png', mimeType: 'image/png' });
    expect(upload.dataUrl).toMatch(/^data:image\/png;base64,/);
    expect(errorText(container)).toBeNull();
  });

  it('accepts an image of exactly the maximum size', async () => {
    const { container, onChange } = renderInput();
    chooseFile(container, pngOfSize(MAX_IMAGE_UPLOAD_BYTES));
    await vi.waitFor(() => expect(onChange).toHaveBeenCalledTimes(1));
  });

  it('rejects an image one byte over the maximum size', () => {
    const { container, onChange } = renderInput();
    chooseFile(container, pngOfSize(MAX_IMAGE_UPLOAD_BYTES + 1));
    expect(errorText(container)).toBe('Use an image smaller than 1 MB');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('rejects a file of another type with the given message', () => {
    const { container, onChange } = renderInput();
    chooseFile(container, new File(['GIF89a'], 'icon.gif', { type: 'image/gif' }));
    expect(errorText(container)).toBe('Use a PNG image');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('clears the message once a valid image is chosen', async () => {
    const { container, onChange } = renderInput();
    chooseFile(container, new File(['GIF89a'], 'icon.gif', { type: 'image/gif' }));
    chooseFile(container, pngOfSize(16));
    await vi.waitFor(() => expect(onChange).toHaveBeenCalledTimes(1));
    expect(errorText(container)).toBeNull();
  });

  it('does nothing when the chooser closes without a file', () => {
    const { container, onChange } = renderInput();
    const input = fileInput(container);
    Object.defineProperty(input, 'files', { value: [], configurable: true });
    runInAct(() => {
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
    expect(onChange).not.toHaveBeenCalled();
    expect(errorText(container)).toBeNull();
  });

  it('explains when the image cannot be read', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(FileReader.prototype, 'readAsDataURL').mockImplementation(function fail(
      this: FileReader,
    ) {
      this.dispatchEvent(new ProgressEvent('error'));
    });
    const { container, onChange } = renderInput();
    chooseFile(container, pngOfSize(16));
    await vi.waitFor(() =>
      expect(errorText(container)).toBe('The image could not be read. Try another file.'),
    );
    expect(onChange).not.toHaveBeenCalled();
  });

  it('removes the image with Remove', () => {
    const { container, onChange } = renderInput(FAVICON);
    click(getButton(container, 'Remove'));
    expect(onChange).toHaveBeenCalledWith(null);
  });
});
