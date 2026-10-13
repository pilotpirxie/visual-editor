import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type JSX,
  type KeyboardEvent,
} from 'react';
import { useAppSettings } from '../../app/appSettings';
import { describeError } from '../../app/errors';
import { useStore } from '../../app/store';
import { isImageValue } from '../../components/fields';
import {
  PLACEHOLDER_RATIOS,
  PLACEHOLDER_SUBJECTS,
  UPLOADED_IMAGE_TYPES,
  type ImageValue,
  type PlaceholderRatio,
  type PlaceholderSubject,
  type UploadedImageValue,
} from '../../components/types';
import { placeholderDataUrl, placeholderImage } from '../../render/placeholder';
import { fittedImage, painterFor, paintPicture } from '../assistant/siteImages';
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
const GENERATED_NAME = 'generated-image';
const GENERATE_SETUP_HINT =
  'Add an OpenRouter key and pick an image model in App settings to generate images.';

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

type ReadImage = { src: string; name: string; width: number; height: number };

function uploadRefusal(file: File): string | null {
  if (!UPLOADED_IMAGE_TYPES.includes(file.type)) return UPLOAD_TYPE_ERROR;
  if (file.size > MAX_IMAGE_UPLOAD_BYTES) return IMAGE_SIZE_ERROR;
  return null;
}

async function readImage(file: File): Promise<ReadImage> {
  const bitmap = await createImageBitmap(file);
  const { width, height } = bitmap;
  bitmap.close();
  const src = await readAsDataUrl(file);
  return { src, name: file.name, width, height };
}

type PlaceholderChoice = { ratio: PlaceholderRatio; subject: PlaceholderSubject };

type ShapeFieldsProps = {
  id: string;
  placeholder: PlaceholderChoice;
  onShape(ratio: string, subject: string): void;
};

function ShapeFields({ id, placeholder, onShape }: ShapeFieldsProps): JSX.Element {
  return (
    <div className="ve-image-shape">
      <Field id={`${id}-ratio`} label="Shape">
        <Select
          id={`${id}-ratio`}
          value={placeholder.ratio}
          options={RATIO_OPTIONS}
          onChange={(event) => onShape(event.target.value, placeholder.subject)}
        />
      </Field>
      <Field id={`${id}-subject`} label="Subject">
        <Select
          id={`${id}-subject`}
          value={placeholder.subject}
          options={SUBJECT_OPTIONS}
          onChange={(event) => onShape(placeholder.ratio, event.target.value)}
        />
      </Field>
    </div>
  );
}

function usualPlaceholder(field: ControlProps['field']): PlaceholderChoice {
  const fieldDefault = field.default;
  const hasPlaceholder = isImageValue(fieldDefault) && fieldDefault.source === 'placeholder';
  return hasPlaceholder ? fieldDefault.placeholder : DEFAULT_PLACEHOLDER;
}

type Generation =
  { status: 'idle' } | { status: 'working' } | { status: 'failed'; message: string };

type ImageGeneratorProps = {
  id: string;
  shape: PlaceholderChoice;
  startingText: string;
  onImage(image: UploadedImageValue): void;
};

function ImageGenerator({ id, shape, startingText, onImage }: ImageGeneratorProps): JSX.Element {
  const painter = painterFor(useAppSettings());
  const siteTitle = useStore((state) => state.project.settings.title);
  const siteDescription = useStore((state) => state.project.settings.description);
  const [wanted, setWanted] = useState(startingText);
  const [generation, setGeneration] = useState<Generation>({ status: 'idle' });
  const runRef = useRef<AbortController | null>(null);
  const inputId = `${id}-generate`;
  const isWorking = generation.status === 'working';
  const canGenerate = painter !== null && !isWorking && wanted.trim() !== '';

  useEffect(() => {
    return () => runRef.current?.abort();
  }, []);

  async function generate(): Promise<void> {
    if (painter === null || !canGenerate) return;
    const run = new AbortController();
    runRef.current = run;
    setGeneration({ status: 'working' });
    const wish = { alt: wanted.trim(), ...shape };
    try {
      const brief = `${siteTitle}\n${siteDescription}`;
      const answer = await paintPicture(painter, brief, wish, run.signal);
      const image = await fittedImage(painter, answer.dataUrl, wish, GENERATED_NAME);
      setGeneration({ status: 'idle' });
      onImage(image);
    } catch (error) {
      if (run.signal.aborted) return;
      console.error(`The image "${wish.alt}" could not be generated`, error);
      setGeneration({ status: 'failed', message: describeError(error) });
    }
  }

  function generateOnEnter(event: KeyboardEvent<HTMLInputElement>): void {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    void generate();
  }

  return (
    <div className="ve-image-generate" data-busy={isWorking || undefined}>
      <Field
        id={inputId}
        label="Describe an image to generate"
        error={generation.status === 'failed' ? generation.message : null}
      >
        <TextInput
          id={inputId}
          value={wanted}
          disabled={painter === null || isWorking}
          placeholder="A baker taking bread out of the oven"
          aria-describedby={generation.status === 'failed' ? fieldErrorId(inputId) : undefined}
          onChange={(event) => setWanted(event.target.value)}
          onKeyDown={generateOnEnter}
        />
      </Field>
      <Button icon="sparkles" disabled={!canGenerate} onClick={() => void generate()}>
        {isWorking ? 'Generating image…' : 'Generate image'}
      </Button>
      {painter === null && <p className="ui-muted">{GENERATE_SETUP_HINT}</p>}
      <p className="ve-visually-hidden" role="status">
        {isWorking ? 'Generating the image' : ''}
      </p>
    </div>
  );
}

type AltFieldsProps = { altId: string; draft: ImageValue; onDraft(draft: ImageValue): void };

function AltFields({ altId, draft, onDraft }: AltFieldsProps): JSX.Element {
  const isDraftValid = hasAccessibleText(draft);
  return (
    <>
      <Field id={altId} label="Alt text" error={isDraftValid ? null : ALT_ERROR}>
        <TextInput
          id={altId}
          value={draft.alt}
          disabled={draft.decorative}
          isInvalid={!isDraftValid}
          aria-describedby={isDraftValid ? undefined : fieldErrorId(altId)}
          onChange={(event) => onDraft({ ...draft, alt: event.target.value })}
        />
      </Field>
      <Checkbox
        label="Decorative image, screen readers skip it"
        checked={draft.decorative}
        onChange={(event) => onDraft({ ...draft, decorative: event.target.checked })}
      />
    </>
  );
}

type ImageDialogProps = {
  id: string;
  field: ControlProps['field'];
  initial: ImageValue;
  onDone(image: ImageValue): void;
  onClose(): void;
};

function ImageDialog({ id, field, initial, onDone, onClose }: ImageDialogProps): JSX.Element {
  const [draft, setDraft] = useState(initial);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const titleId = `${id}-dialog-title`;
  const uploadId = `${id}-upload`;
  const uploadHintId = `${uploadId}-hint`;
  const uploadDescribedBy =
    uploadError === null ? uploadHintId : `${uploadHintId} ${fieldErrorId(uploadId)}`;

  async function upload(event: ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file === undefined) return;
    const refusal = uploadRefusal(file);
    if (refusal !== null) {
      setUploadError(refusal);
      return;
    }
    try {
      const { src, name, width, height } = await readImage(file);
      setUploadError(null);
      setDraft(({ alt, decorative }) => {
        return { source: 'upload', src, name, alt, decorative, width, height };
      });
    } catch (readError) {
      console.error(`Could not read the image ${file.name}`, readError);
      setUploadError(UPLOAD_READ_ERROR);
    }
  }

  function switchToPlaceholder(): void {
    setUploadError(null);
    setDraft(placeholderImage(usualPlaceholder(field), draft.alt, draft.decorative));
  }

  function showGenerated(image: UploadedImageValue): void {
    setUploadError(null);
    setDraft(({ decorative }) => ({ ...image, decorative }));
  }

  function finish(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (!hasAccessibleText(draft)) return;
    onDone(draft);
    closeDialogOf(event.currentTarget);
  }

  function changeShape(ratio: string, subject: string): void {
    if (draft.source !== 'placeholder' || !isRatio(ratio) || !isSubject(subject)) return;
    setDraft(placeholderImage({ ratio, subject }, draft.alt, draft.decorative));
  }

  return (
    <Dialog labelId={titleId} onClose={onClose}>
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
        <ImageGenerator
          id={id}
          shape={draft.source === 'placeholder' ? draft.placeholder : usualPlaceholder(field)}
          startingText={initial.alt}
          onImage={showGenerated}
        />
        {draft.source === 'placeholder' && (
          <ShapeFields id={id} placeholder={draft.placeholder} onShape={changeShape} />
        )}
        <AltFields altId={`${id}-alt`} draft={draft} onDraft={setDraft} />
        <DialogActions>
          <Button onClick={(event) => closeDialogOf(event.currentTarget)}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={!hasAccessibleText(draft)}>
            Done
          </Button>
        </DialogActions>
      </DialogBody>
    </Dialog>
  );
}

export function ImageField({ field, value, id, describedBy, onChange }: ControlProps): JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const image = isImageValue(value) ? value : null;
  const labelId = `${id}-label`;

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
            onClick={() => setIsOpen(true)}
          >
            Change image
          </Button>
        </div>
      </div>

      {isOpen && (
        <ImageDialog
          id={id}
          field={field}
          initial={image ?? placeholderImage(DEFAULT_PLACEHOLDER, '')}
          onDone={(picked) => onChange(picked, 'discrete')}
          onClose={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
