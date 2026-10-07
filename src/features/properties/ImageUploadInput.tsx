import { useRef, useState, type ChangeEvent, type JSX } from 'react';
import type { ImageUpload } from '../../app/projectSlice';
import type { Asset } from '../../app/types';
import { Icon } from '../editor/Icon';

export const MAX_IMAGE_UPLOAD_BYTES = 1024 * 1024;

type ImageUploadInputProps = {
  id: string;
  label: string;
  help: string;
  asset: Asset | undefined;
  accept: readonly string[];
  typeError: string;
  shape: 'social' | 'icon';
  onChange(upload: ImageUpload | null): void;
};

const SIZE_ERROR = 'Use an image smaller than 1 MB';

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
        return;
      }
      reject(new Error('The image could not be read as a data URL'));
    };
    reader.onerror = () => reject(reader.error ?? new Error('The image could not be read'));
    reader.readAsDataURL(file);
  });
}

export function ImageUploadInput({
  id,
  label,
  help,
  asset,
  accept,
  typeError,
  shape,
  onChange,
}: ImageUploadInputProps): JSX.Element {
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const labelId = `${id}-label`;

  async function upload(event: ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file === undefined) return;
    if (!accept.includes(file.type)) {
      setError(typeError);
      return;
    }
    if (file.size > MAX_IMAGE_UPLOAD_BYTES) {
      setError(SIZE_ERROR);
      return;
    }
    try {
      const dataUrl = await readAsDataUrl(file);
      setError(null);
      onChange({ name: file.name, mimeType: file.type, dataUrl });
    } catch (readError) {
      console.error(`Could not read the image ${file.name}`, readError);
      setError('The image could not be read. Try another file.');
    }
  }

  return (
    <div className="ve-control" data-field-path={id}>
      <span className="ve-control-label" id={labelId}>
        {label}
      </span>
      {asset !== undefined && (
        <img
          className={`ve-upload-preview ve-upload-preview--${shape}`}
          src={asset.dataUrl}
          alt=""
        />
      )}
      <div className="ve-upload-actions">
        <button
          type="button"
          className="ve-button ve-button--outline"
          aria-describedby={labelId}
          onClick={() => inputRef.current?.click()}
        >
          <Icon name="image" />
          {asset === undefined ? 'Upload image' : 'Replace image'}
        </button>
        {asset !== undefined && (
          <button
            type="button"
            className="ve-button"
            aria-describedby={labelId}
            onClick={() => onChange(null)}
          >
            Remove
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        className="ve-visually-hidden"
        type="file"
        accept={accept.join(',')}
        tabIndex={-1}
        aria-hidden="true"
        onChange={(event) => void upload(event)}
      />
      <p className="ve-control-help">{help}</p>
      {error !== null && (
        <p className="ve-control-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
