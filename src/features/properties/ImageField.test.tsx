import { afterEach, describe, expect, it, vi } from 'vitest';
import type { EditKind } from '../../app/projectSlice';
import type { Field, ImageValue } from '../../components/types';
import { placeholderImage } from '../../render/placeholder';
import { click, getButton, queryButton, render, runInAct } from '../../test/dom';
import { ImageField } from './ImageField';
import { MAX_IMAGE_UPLOAD_BYTES } from './ImageUploadInput';

const AVATAR = placeholderImage({ ratio: '1:1', subject: 'person' }, 'Ada');

const UPLOADED: ImageValue = {
  source: 'upload',
  src: 'data:image/png;base64,iVBORw0KGgo=',
  name: 'ada.png',
  alt: 'Ada at her desk',
  decorative: false,
  width: 640,
  height: 480,
};

const FIELD: Field = { name: 'photo', label: 'Photo', type: 'image', default: AVATAR };

type Rendered = {
  container: HTMLDivElement;
  onChange: ReturnType<typeof vi.fn<(value: unknown, kind: EditKind) => void>>;
};

function renderField(value: unknown): Rendered {
  const onChange = vi.fn<(value: unknown, kind: EditKind) => void>();
  const { container } = render(
    <ImageField
      field={FIELD}
      value={value}
      id="img"
      path="photo"
      describedBy={undefined}
      isInvalid={false}
      onChange={onChange}
    />,
  );
  return { container, onChange };
}

function stubImageDecoding(): void {
  vi.stubGlobal(
    'createImageBitmap',
    vi.fn(() => Promise.resolve({ width: 640, height: 480, close: vi.fn() })),
  );
}

function chooseFile(container: HTMLElement, file: File): void {
  const input = container.querySelector<HTMLInputElement>('input[type="file"]');
  if (input === null) throw new Error('The file input is missing');
  Object.defineProperty(input, 'files', { value: [file], configurable: true });
  runInAct(() => {
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
}

function png(bytes = 16, name = 'ada.png'): File {
  return new File([new Uint8Array(bytes)], name, { type: 'image/png' });
}

function previewSrc(container: HTMLElement): string | null {
  return container.querySelector('.ve-image-preview')?.getAttribute('src') ?? null;
}

function errorText(container: HTMLElement): string | null {
  return container.querySelector('[role="alert"]')?.textContent ?? null;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('ImageField', () => {
  it('uploads an image and keeps its alt text, file name and size', async () => {
    stubImageDecoding();
    const { container, onChange } = renderField(AVATAR);
    click(getButton(container, 'Change image'));
    expect(container.querySelector('#img-ratio')).not.toBeNull();
    chooseFile(container, png());
    await vi.waitFor(() => expect(previewSrc(container)).toMatch(/^data:image\/png;base64,/));
    expect(container.querySelector('#img-ratio')).toBeNull();
    expect(getButton(container, 'Replace image')).toBeDefined();
    click(getButton(container, 'Done'));
    expect(onChange).toHaveBeenCalledWith(
      {
        source: 'upload',
        src: expect.stringMatching(/^data:image\/png;base64,/),
        name: 'ada.png',
        alt: 'Ada',
        decorative: false,
        width: 640,
        height: 480,
      },
      'discrete',
    );
  });

  it('shows an uploaded image in the field and in the dialog', () => {
    const { container } = renderField(UPLOADED);
    expect(container.querySelector('.ve-image-thumb')?.getAttribute('src')).toBe(UPLOADED.src);
    click(getButton(container, 'Change image'));
    expect(previewSrc(container)).toBe(UPLOADED.src);
  });

  it('goes back to the placeholder the block starts with', () => {
    const { container, onChange } = renderField(UPLOADED);
    click(getButton(container, 'Change image'));
    click(getButton(container, 'Use a placeholder'));
    expect(queryButton(container, 'Use a placeholder')).toBeNull();
    expect(container.querySelector<HTMLSelectElement>('#img-ratio')?.value).toBe('1:1');
    expect(container.querySelector<HTMLSelectElement>('#img-subject')?.value).toBe('person');
    click(getButton(container, 'Done'));
    expect(onChange).toHaveBeenCalledWith(
      placeholderImage({ ratio: '1:1', subject: 'person' }, 'Ada at her desk'),
      'discrete',
    );
  });

  it.each([
    [
      'an SVG',
      new File(['<svg/>'], 'logo.svg', { type: 'image/svg+xml' }),
      'Use a PNG, JPEG, WebP or GIF image',
    ],
    ['a file over 1 MB', png(MAX_IMAGE_UPLOAD_BYTES + 1), 'Use an image smaller than 1 MB'],
  ])('rejects %s and keeps the current image', (_name, file, message) => {
    const { container } = renderField(AVATAR);
    click(getButton(container, 'Change image'));
    const before = previewSrc(container);
    chooseFile(container, file);
    expect(errorText(container)).toBe(message);
    expect(previewSrc(container)).toBe(before);
    expect(getButton(container, 'Upload image').getAttribute('aria-describedby')).toBe(
      'img-upload-hint img-upload-error',
    );
  });

  it('explains when the file is not an image it can read', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn(() => Promise.reject(new DOMException('Undecodable', 'InvalidStateError'))),
    );
    const { container } = renderField(AVATAR);
    click(getButton(container, 'Change image'));
    chooseFile(container, png());
    await vi.waitFor(() =>
      expect(errorText(container)).toBe('The image could not be read. Try another file.'),
    );
    expect(error).toHaveBeenCalledWith(
      'Could not read the image ada.png',
      expect.any(DOMException),
    );
  });
});
