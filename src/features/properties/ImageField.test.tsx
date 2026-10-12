import { afterEach, describe, expect, it, vi } from 'vitest';
import type { EditKind } from '../../app/projectSlice';
import type { Field, ImageValue } from '../../components/types';
import { placeholderImage } from '../../render/placeholder';
import {
  changeValue,
  choiceInput,
  chooseFile,
  click,
  getButton,
  queryButton,
  render,
  runInAct,
} from '../../test/dom';
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

  it('stores the parts of an uploaded image in the order project files use', async () => {
    stubImageDecoding();
    const { container, onChange } = renderField(AVATAR);
    click(getButton(container, 'Change image'));
    chooseFile(container, png());
    await vi.waitFor(() => expect(previewSrc(container)).toMatch(/^data:image\/png;base64,/));
    click(getButton(container, 'Done'));
    expect(Object.keys(Object(onChange.mock.calls[0]?.[0]))).toEqual([
      'source',
      'src',
      'name',
      'alt',
      'decorative',
      'width',
      'height',
    ]);
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

describe('ImageField summary', () => {
  it.each([
    ['its alt text', AVATAR, 'Ada'],
    ['that it is decorative', { ...AVATAR, alt: '', decorative: true }, 'Decorative image'],
    ['that alt text is missing', { ...AVATAR, alt: '  ' }, 'No alt text yet'],
  ])('shows %s next to the thumbnail', (_name, value, text) => {
    const { container } = renderField(value);
    expect(container.querySelector('.ve-image-alt')?.textContent).toBe(text);
    expect(container.querySelector('.ve-image-thumb')).not.toBeNull();
  });

  it('says there is no image for a value that is not an image', () => {
    const { container } = renderField('not an image');
    expect(container.querySelector('.ve-image-alt')?.textContent).toBe('No image');
    expect(container.querySelector('.ve-image-thumb')).toBeNull();
    expect(container.querySelector('dialog')).toBeNull();
  });

  it('names its button after the field', () => {
    const { container } = renderField(AVATAR);
    expect(getButton(container, 'Change image').getAttribute('aria-labelledby')).toBe(
      'img-label img',
    );
    expect(container.querySelector('#img-label')?.textContent).toBe('Photo');
  });
});

describe('ImageField dialog', () => {
  function altInput(container: HTMLElement): HTMLInputElement {
    const input = container.querySelector<HTMLInputElement>('#img-alt');
    if (input === null) throw new Error('The alt text field is missing');
    return input;
  }

  it('starts from a 4:3 photo placeholder when there is no image yet', () => {
    const { container } = renderField(undefined);
    click(getButton(container, 'Change image'));
    expect(container.querySelector<HTMLSelectElement>('#img-ratio')?.value).toBe('4:3');
    expect(container.querySelector<HTMLSelectElement>('#img-subject')?.value).toBe('photo');
    expect(altInput(container).value).toBe('');
  });

  it('asks for alt text until the image has it or is marked decorative', () => {
    const { container, onChange } = renderField({ ...AVATAR, alt: '' });
    click(getButton(container, 'Change image'));
    expect(errorText(container)).toBe('Add alt text or mark the image as decorative');
    expect(getButton(container, 'Done').disabled).toBe(true);
    expect(altInput(container).getAttribute('aria-describedby')).toBe('img-alt-error');
    changeValue(altInput(container), 'Ada smiling');
    expect(errorText(container)).toBeNull();
    click(getButton(container, 'Done'));
    expect(onChange).toHaveBeenCalledWith({ ...AVATAR, alt: 'Ada smiling' }, 'discrete');
  });

  it('lets a decorative image go without alt text and locks the alt field', () => {
    const { container, onChange } = renderField({ ...AVATAR, alt: '' });
    click(getButton(container, 'Change image'));
    click(choiceInput(container, 'Decorative image, screen readers skip it'));
    expect(altInput(container).disabled).toBe(true);
    expect(getButton(container, 'Done').disabled).toBe(false);
    click(getButton(container, 'Done'));
    expect(onChange).toHaveBeenCalledWith({ ...AVATAR, alt: '', decorative: true }, 'discrete');
  });

  it('changes the shape and the subject of a placeholder and keeps the alt text', () => {
    const { container, onChange } = renderField(AVATAR);
    click(getButton(container, 'Change image'));
    changeValue(container.querySelector('#img-ratio'), '16:9');
    changeValue(container.querySelector('#img-subject'), 'product');
    click(getButton(container, 'Done'));
    expect(onChange).toHaveBeenCalledWith(
      placeholderImage({ ratio: '16:9', subject: 'product' }, 'Ada'),
      'discrete',
    );
  });

  it('changes nothing when cancelled, and starts over the next time it opens', () => {
    const { container, onChange } = renderField(AVATAR);
    click(getButton(container, 'Change image'));
    changeValue(altInput(container), 'Something else');
    chooseFile(container, new File(['<svg/>'], 'logo.svg', { type: 'image/svg+xml' }));
    expect(errorText(container)).toBe('Use a PNG, JPEG, WebP or GIF image');
    click(getButton(container, 'Cancel'));
    expect(onChange).not.toHaveBeenCalled();
    expect(container.querySelector('#img-alt')).toBeNull();
    click(getButton(container, 'Change image'));
    expect(altInput(container).value).toBe('Ada');
    expect(errorText(container)).toBeNull();
  });

  it('forgets an upload problem when the placeholder is used instead', () => {
    const { container } = renderField(UPLOADED);
    click(getButton(container, 'Change image'));
    chooseFile(container, png(MAX_IMAGE_UPLOAD_BYTES + 1));
    expect(errorText(container)).toBe('Use an image smaller than 1 MB');
    click(getButton(container, 'Use a placeholder'));
    expect(errorText(container)).toBeNull();
    expect(getButton(container, 'Upload image').getAttribute('aria-describedby')).toBe(
      'img-upload-hint',
    );
  });

  it('falls back to a 4:3 photo when the block does not start with a placeholder', () => {
    const onChange = vi.fn<(value: unknown, kind: EditKind) => void>();
    const { container } = render(
      <ImageField
        field={{ ...FIELD, default: UPLOADED }}
        value={UPLOADED}
        id="img"
        path="photo"
        describedBy={undefined}
        isInvalid={false}
        onChange={onChange}
      />,
    );
    click(getButton(container, 'Change image'));
    click(getButton(container, 'Use a placeholder'));
    expect(container.querySelector<HTMLSelectElement>('#img-ratio')?.value).toBe('4:3');
    expect(container.querySelector<HTMLSelectElement>('#img-subject')?.value).toBe('photo');
  });

  it('does nothing when the file picker is closed without a file', () => {
    const { container } = renderField(AVATAR);
    click(getButton(container, 'Change image'));
    const before = previewSrc(container);
    const input = container.querySelector<HTMLInputElement>('input[type="file"]');
    runInAct(() => input?.dispatchEvent(new Event('change', { bubbles: true })));
    expect(previewSrc(container)).toBe(before);
    expect(errorText(container)).toBeNull();
  });
});
