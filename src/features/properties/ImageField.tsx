import { useState, type FormEvent, type JSX } from 'react';
import { isImageValue } from '../../components/fields';
import {
  PLACEHOLDER_RATIOS,
  PLACEHOLDER_SUBJECTS,
  type ImageValue,
  type PlaceholderRatio,
  type PlaceholderSubject,
} from '../../components/types';
import { placeholderDataUrl, placeholderImage } from '../../render/placeholder';
import type { ControlProps } from './FieldControl';
import {
  Button,
  Checkbox,
  closeDialogOf,
  Dialog,
  DialogActions,
  DialogBody,
  Field,
  fieldErrorId,
  Select,
  TextInput,
} from '../../../packages/ui/src';

const DEFAULT_PLACEHOLDER = { ratio: '4:3', subject: 'photo' } as const;

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

export function ImageField({ field, value, id, describedBy, onChange }: ControlProps): JSX.Element {
  const [draft, setDraft] = useState<ImageValue | null>(null);
  const image = isImageValue(value) ? value : null;
  const labelId = `${id}-label`;
  const titleId = `${id}-dialog-title`;
  const altId = `${id}-alt`;

  function open(): void {
    setDraft(image ?? placeholderImage(DEFAULT_PLACEHOLDER, ''));
  }

  function finish(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (draft === null || !hasAccessibleText(draft)) return;
    onChange(draft, 'discrete');
    closeDialogOf(event.currentTarget);
  }

  function changeShape(ratio: string, subject: string): void {
    if (draft === null || !isRatio(ratio) || !isSubject(subject)) return;
    setDraft(placeholderImage({ ratio, subject }, draft.alt, draft.decorative));
  }

  const isDraftValid = draft !== null && hasAccessibleText(draft);

  return (
    <>
      <span className="ui-field-label" id={labelId}>
        {field.label}
      </span>
      <div className="ve-image">
        {image && (
          <img className="ve-image-thumb" src={placeholderDataUrl(image.placeholder)} alt="" />
        )}
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
            <img className="ve-image-preview" src={placeholderDataUrl(draft.placeholder)} alt="" />
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
