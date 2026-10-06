import { useEffect, useRef, useState, type FormEvent, type JSX } from 'react';
import { isImageValue } from '../../components/fields';
import {
  PLACEHOLDER_RATIOS,
  PLACEHOLDER_SUBJECTS,
  type ImageValue,
  type PlaceholderRatio,
  type PlaceholderSubject,
} from '../../components/types';
import { placeholderDataUrl, placeholderImage } from '../../render/placeholder';
import { Icon } from '../editor/Icon';
import type { ControlProps } from './FieldControl';

const DEFAULT_PLACEHOLDER = { ratio: '4:3', subject: 'photo' } as const;

const SUBJECT_LABELS: Record<PlaceholderSubject, string> = {
  photo: 'Photo',
  person: 'Person',
  product: 'Product',
  logo: 'Logo',
  screenshot: 'Screenshot',
};

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
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [draft, setDraft] = useState<ImageValue | null>(null);
  const image = isImageValue(value) ? value : null;
  const labelId = `${id}-label`;
  const titleId = `${id}-dialog-title`;
  const altId = `${id}-alt`;
  const altErrorId = `${id}-alt-error`;

  const isEditing = draft !== null;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (isEditing && dialog !== null && !dialog.open) dialog.showModal();
  }, [isEditing]);

  function open(): void {
    setDraft(image ?? placeholderImage(DEFAULT_PLACEHOLDER, ''));
  }

  function finish(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (draft === null || !hasAccessibleText(draft)) return;
    onChange(draft, 'discrete');
    dialogRef.current?.close();
  }

  function changeShape(ratio: string, subject: string): void {
    if (draft === null || !isRatio(ratio) || !isSubject(subject)) return;
    setDraft(placeholderImage({ ratio, subject }, draft.alt, draft.decorative));
  }

  const isDraftValid = draft !== null && hasAccessibleText(draft);

  return (
    <>
      <span className="ve-control-label" id={labelId}>
        {field.label}
      </span>
      <div className="ve-image">
        {image && (
          <img className="ve-image-thumb" src={placeholderDataUrl(image.placeholder)} alt="" />
        )}
        <div className="ve-image-meta">
          <p className="ve-image-alt">{image ? describeImage(image) : 'No image'}</p>
          <button
            id={id}
            type="button"
            className="ve-button ve-button--outline"
            aria-labelledby={`${labelId} ${id}`}
            aria-describedby={describedBy}
            onClick={open}
          >
            <Icon name="image" />
            Change image
          </button>
        </div>
      </div>

      <dialog
        ref={dialogRef}
        className="ve-dialog"
        aria-labelledby={titleId}
        onClose={() => setDraft(null)}
      >
        {draft && (
          <form className="ve-dialog-form" onSubmit={finish}>
            <h2 id={titleId} className="ve-properties-title">
              {field.label}
            </h2>
            <img className="ve-image-preview" src={placeholderDataUrl(draft.placeholder)} alt="" />
            <div className="ve-dialog-row">
              <label className="ve-control">
                <span className="ve-control-label">Shape</span>
                <select
                  className="ve-input"
                  value={draft.placeholder.ratio}
                  onChange={(event) => changeShape(event.target.value, draft.placeholder.subject)}
                >
                  {PLACEHOLDER_RATIOS.map((ratio) => (
                    <option key={ratio} value={ratio}>
                      {ratio}
                    </option>
                  ))}
                </select>
              </label>
              <label className="ve-control">
                <span className="ve-control-label">Subject</span>
                <select
                  className="ve-input"
                  value={draft.placeholder.subject}
                  onChange={(event) => changeShape(draft.placeholder.ratio, event.target.value)}
                >
                  {PLACEHOLDER_SUBJECTS.map((subject) => (
                    <option key={subject} value={subject}>
                      {SUBJECT_LABELS[subject]}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="ve-control">
              <label className="ve-control-label" htmlFor={altId}>
                Alt text
              </label>
              <input
                id={altId}
                className="ve-input"
                type="text"
                value={draft.alt}
                disabled={draft.decorative}
                aria-invalid={!isDraftValid}
                aria-describedby={isDraftValid ? undefined : altErrorId}
                onChange={(event) => setDraft({ ...draft, alt: event.target.value })}
              />
              <p className="ve-control-help">
                Describe what the image shows for people who can't see it.
              </p>
            </div>
            <label className="ve-check">
              <input
                type="checkbox"
                checked={draft.decorative}
                onChange={(event) => setDraft({ ...draft, decorative: event.target.checked })}
              />
              Decorative image, screen readers skip it
            </label>
            {!isDraftValid && (
              <p id={altErrorId} className="ve-control-error" role="alert">
                Add alt text or mark the image as decorative
              </p>
            )}
            <div className="ve-dialog-actions">
              <button
                type="button"
                className="ve-button ve-button--outline"
                onClick={() => dialogRef.current?.close()}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="ve-button ve-button--primary"
                disabled={!isDraftValid}
              >
                Done
              </button>
            </div>
          </form>
        )}
      </dialog>
    </>
  );
}
