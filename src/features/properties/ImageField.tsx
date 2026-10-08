import { useRef, useState, type ChangeEvent, type FormEvent, type JSX } from 'react';
import { isImageValue } from '../../components/fields';
import {
  PLACEHOLDER_RATIOS,
  PLACEHOLDER_SUBJECTS,
  UPLOADED_IMAGE_TYPES,
  type ImageValue,
  type PlaceholderRatio,
  type PlaceholderSubject,
} from '../../components/types';
import { placeholderDataUrl, placeholderImage } from '../../render/placeholder';
import type { ControlProps } from './FieldControl';
import { IMAGE_SIZE_ERROR, MAX_IMAGE_UPLOAD_BYTES, readAsDataUrl } from './ImageUploadInput';
import {
  Button,
  Checkbox,
  closeDialogOf,
  Dialog,
  DialogActions,
  DialogBody,
  Field,
  FieldError,
  fieldErrorId,
  Select,
  TextInput,
} from '../../../packages/ui/src';

const DEFAULT_PLACEHOLDER = { ratio: '4:3', subject: 'photo' } as const;

const UPLOAD_HINT = 'PNG, JPEG, WebP or GIF, up to 1 MB.';
const UPLOAD_TYPE_ERROR = 'Use a PNG, JPEG, WebP or GIF image';
const UPLOAD_READ_ERROR = 'The image could not be read. Try another file.';

const SUBJECT_LABELS: Record<PlaceholderSubject, string> = {
  photo: 'Photo',
  person: 'Person',
  product: 'Product',
  logo: 'Logo',
  screenshot: 'Screenshot',
};

const ALT_ERROR = 'Add alt text or mark the image as decorative';

const RATIO_OPTIONS = PLACEHOLDER_RATIOS.map((ratio) => ({ value: ratio, label: ratio }));

const SUBJECT_OPTIONS = PLACEHOLDER_SUBJECTS.map((subject) => ({
  value: subject,
  label: SUBJECT_LABELS[subject],
}));

function isRatio(value: string): value is PlaceholderRatio {
  return PLACEHOLDER_RATIOS.some((ratio) => ratio === value);
}

function isSubject(value: string): value is PlaceholderSubject {
  return PLACEHOLDER_SUBJECTS.some((subject) => subject === value);
}

function describeImage(image: ImageValue): string {
  if (image.decorative) return 'Decorative image';
  if (image.alt.trim() === '') return 'No alt text yet';
  return image.alt;
}

function hasAccessibleText(image: ImageValue): boolean {
  return image.decorative || image.alt.trim() !== '';
}

function imageSrc(image: ImageValue): string {
  return image.source === 'upload' ? image.src : placeholderDataUrl(image.placeholder);
}

export function ImageField({ field, value, id, describedBy, onChange }: ControlProps): JSX.Element {
  const [draft, setDraft] = useState<ImageValue | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const image = isImageValue(value) ? value : null;
  const labelId = `${id}-label`;
  const titleId = `${id}-dialog-title`;
  const altId = `${id}-alt`;
  const uploadId = `${id}-upload`;
  const uploadHintId = `${uploadId}-hint`;
  const uploadDescribedBy =
    uploadError === null ? uploadHintId : `${uploadHintId} ${fieldErrorId(uploadId)}`;

  function open(): void {
    setUploadError(null);
    setDraft(image ?? placeholderImage(DEFAULT_PLACEHOLDER, ''));
  }

  async function upload(event: ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file === undefined) return;
    if (!UPLOADED_IMAGE_TYPES.includes(file.type)) {
      setUploadError(UPLOAD_TYPE_ERROR);
      return;
    }
    if (file.size > MAX_IMAGE_UPLOAD_BYTES) {
      setUploadError(IMAGE_SIZE_ERROR);
      return;
    }
    try {
      const bitmap = await createImageBitmap(file);
      const size = { width: bitmap.width, height: bitmap.height };
      bitmap.close();
      const src = await readAsDataUrl(file);
      setUploadError(null);
      setDraft((current) => {
        if (current === null) return null;
        const { alt, decorative } = current;
        return { source: 'upload', src, name: file.name, alt, decorative, ...size };
      });
    } catch (readError) {
      console.error(`Could not read the image ${file.name}`, readError);
      setUploadError(UPLOAD_READ_ERROR);
    }
  }

  function switchToPlaceholder(): void {
    if (draft === null) return;
    const fieldDefault = field.default;
    const placeholder =
      isImageValue(fieldDefault) && fieldDefault.source === 'placeholder'
        ? fieldDefault.placeholder
        : DEFAULT_PLACEHOLDER;
    setUploadError(null);
    setDraft(placeholderImage(placeholder, draft.alt, draft.decorative));
  }

  function finish(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (draft === null || !hasAccessibleText(draft)) return;
    onChange(draft, 'discrete');
    closeDialogOf(event.currentTarget);
  }

  function changeShape(ratio: string, subject: string): void {
    if (draft?.source !== 'placeholder' || !isRatio(ratio) || !isSubject(subject)) return;
    setDraft(placeholderImage({ ratio, subject }, draft.alt, draft.decorative));
  }

  const isDraftValid = draft !== null && hasAccessibleText(draft);

  return (
    <>
      <span className="ui-field-label" id={labelId}>
        {field.label}
      </span>
      <div className="ve-image">
        {image && <img className="ve-image-thumb" src={imageSrc(image)} alt="" />}
        <div className="ve-image-meta">
          <p className="ve-image-alt">{image ? describeImage(image) : 'No image'}</p>
          <Button
            id={id}
            icon="image"
            aria-labelledby={`${labelId} ${id}`}
            aria-describedby={describedBy}
            onClick={open}
          >
            Change image
          </Button>
        </div>
      </div>

      {draft !== null && (
        <Dialog labelId={titleId} onClose={() => setDraft(null)}>
          <DialogBody titleId={titleId} title={field.label} onSubmit={finish}>
            <img className="ve-image-preview" src={imageSrc(draft)} alt="" />
            <div className="ve-upload-actions">
              <Button
                icon="upload"
                aria-describedby={uploadDescribedBy}
                onClick={() => fileInputRef.current?.click()}
              >
                {draft.source === 'upload' ? 'Replace image' : 'Upload image'}
              </Button>
              {draft.source === 'upload' && (
                <Button variant="ghost" onClick={switchToPlaceholder}>
                  Use a placeholder
                </Button>
              )}
            </div>
            <p id={uploadHintId} className="ui-muted">
              {UPLOAD_HINT}
            </p>
            <input
              ref={fileInputRef}
              className="ve-visually-hidden"
              type="file"
              accept={UPLOADED_IMAGE_TYPES.join(',')}
              tabIndex={-1}
              aria-hidden="true"
              onChange={(event) => void upload(event)}
            />
            <FieldError id={uploadId} error={uploadError} />
            {draft.source === 'placeholder' && (
              <div className="ve-image-shape">
                <Field id={`${id}-ratio`} label="Shape">
                  <Select
                    id={`${id}-ratio`}
                    value={draft.placeholder.ratio}
                    options={RATIO_OPTIONS}
                    onChange={(event) => changeShape(event.target.value, draft.placeholder.subject)}
                  />
                </Field>
                <Field id={`${id}-subject`} label="Subject">
                  <Select
                    id={`${id}-subject`}
                    value={draft.placeholder.subject}
                    options={SUBJECT_OPTIONS}
                    onChange={(event) => changeShape(draft.placeholder.ratio, event.target.value)}
                  />
                </Field>
              </div>
            )}
            <Field id={altId} label="Alt text" error={isDraftValid ? null : ALT_ERROR}>
              <TextInput
                id={altId}
                value={draft.alt}
                disabled={draft.decorative}
                isInvalid={!isDraftValid}
                aria-describedby={isDraftValid ? undefined : fieldErrorId(altId)}
                onChange={(event) => setDraft({ ...draft, alt: event.target.value })}
              />
            </Field>
            <Checkbox
              label="Decorative image, screen readers skip it"
              checked={draft.decorative}
              onChange={(event) => setDraft({ ...draft, decorative: event.target.checked })}
            />
            <DialogActions>
              <Button onClick={(event) => closeDialogOf(event.currentTarget)}>Cancel</Button>
              <Button type="submit" variant="primary" disabled={!isDraftValid}>
                Done
              </Button>
            </DialogActions>
          </DialogBody>
        </Dialog>
      )}
    </>
  );
}
