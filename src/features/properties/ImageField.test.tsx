import { afterEach, describe, expect, it, vi } from 'vitest';
import { updateAppSettings, type AppSettings } from '../../app/appSettings';
import type { EditKind } from '../../app/projectSlice';
import type { Field, ImageValue } from '../../components/types';
import { placeholderImage } from '../../render/placeholder';
import {
  changeValue,
  choiceInput,
  chooseFile,
  click,
  getButton,
  pressKey,
  queryButton,
  render,
  runInAct,
} from '../../test/dom';
import type { Picture } from '../assistant/siteImages';
import { ImageField } from './ImageField';
import { MAX_IMAGE_UPLOAD_BYTES } from './ImageUploadInput';

const GENERATED_SRC = 'data:image/webp;base64,aGVsbG8=';

vi.mock('../assistant/siteImages', async (original) => {
  const actual = await original<typeof import('../assistant/siteImages')>();
  return {
    ...actual,
    painterFor: (setup: AppSettings) => {
      const painter = actual.painterFor(setup);
      if (painter === null) return null;
      const fit = async (): Promise<Picture> => ({ src: GENERATED_SRC, width: 512, height: 512 });
      return { ...painter, fit };
    },
  };
});

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

type ImageBody = { model: string; prompt: string; aspect_ratio: string };

function stubImageModel(reply: () => Response): ImageBody[] {
  const bodies: ImageBody[] = [];
  updateAppSettings({
    openRouterKey: 'sk-or-test',
    imageModel: { id: 'acme/painter', name: 'Acme Painter' },
  });
  vi.stubGlobal('fetch', async (_url: string, init: RequestInit = {}) => {
    bodies.push(JSON.parse(String(init.body)));
    return reply();
  });
  return bodies;
}

function paintedReply(): Response {
  const data = [{ b64_json: 'aGVsbG8=', media_type: 'image/png' }];
  return new Response(JSON.stringify({ data, usage: { total_tokens: 10, cost: 0.01 } }));
}

function generateInput(container: HTMLElement): HTMLInputElement {
  const input = container.querySelector('#img-generate');
  if (!(input instanceof HTMLInputElement)) throw new Error('No image description input');
  return input;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  localStorage.clear();
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

  it('offers to generate an image only once a key and an image model are set', () => {
    const { container } = renderField(AVATAR);
    click(getButton(container, 'Change image'));
    expect(getButton(container, 'Generate image').disabled).toBe(true);
    expect(generateInput(container).disabled).toBe(true);
    expect(container.textContent).toContain('pick an image model in App settings');
  });

  it('generates an image in the shape of the placeholder and describes it in the alt text', async () => {
    const bodies = stubImageModel(paintedReply);
    const { container, onChange } = renderField(AVATAR);
    click(getButton(container, 'Change image'));
    expect(container.textContent).not.toContain('pick an image model in App settings');
    expect(generateInput(container).value).toBe('Ada');
    changeValue(generateInput(container), ' Ada smiling at her desk ');
    click(getButton(container, 'Generate image'));
    expect(getButton(container, 'Generating image…').disabled).toBe(true);
    await vi.waitFor(() => expect(previewSrc(container)).toBe(GENERATED_SRC));
    expect(bodies).toHaveLength(1);
    expect(bodies[0].model).toBe('acme/painter');
    expect(bodies[0].aspect_ratio).toBe('1:1');
    expect(bodies[0].prompt).toContain('portrait');
    expect(bodies[0].prompt).toContain('It shows: Ada smiling at her desk');
    click(getButton(container, 'Done'));
    expect(onChange).toHaveBeenCalledWith(
      {
        source: 'upload',
        name: 'generated-image.webp',
        alt: 'Ada smiling at her desk',
        decorative: false,
        src: GENERATED_SRC,
        width: 512,
        height: 512,
      },
      'discrete',
    );
  });

  it('generates on Enter without closing the dialog and keeps an image decorative', async () => {
    stubImageModel(paintedReply);
    const { container, onChange } = renderField(
      placeholderImage({ ratio: '16:9', subject: 'photo' }, '', true),
    );
    click(getButton(container, 'Change image'));
    changeValue(generateInput(container), 'Fresh bread on a wooden table');
    pressKey(generateInput(container), 'Enter');
    await vi.waitFor(() => expect(previewSrc(container)).toBe(GENERATED_SRC));
    expect(onChange).not.toHaveBeenCalled();
    click(getButton(container, 'Done'));
    expect(onChange.mock.calls[0][0]).toMatchObject({
      alt: 'Fresh bread on a wooden table',
      decorative: true,
    });
  });

  it('says why an image could not be generated and keeps the image it had', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    stubImageModel(() => new Response(JSON.stringify({ error: { code: 402 } }), { status: 402 }));
    const { container } = renderField(UPLOADED);
    click(getButton(container, 'Change image'));
    click(getButton(container, 'Generate image'));
    await vi.waitFor(() => {
      expect(errorText(container)).toBe(
        'This OpenRouter key does not have enough credit for the request.',
      );
    });
    expect(previewSrc(container)).toBe(UPLOADED.src);
    expect(getButton(container, 'Generate image').disabled).toBe(false);
  });
});
