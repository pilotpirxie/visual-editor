import { useEffect, useRef, useState, type FormEvent, type JSX } from 'react';
import { pageRenamed } from '../../app/projectSlice';
import { slugError, uniqueSlug } from '../../app/slugs';
import { dispatch, useStore } from '../../app/store';
import { addPage } from './pageActions';
import './pages.css';

type PageDialogProps = { pageId: string | null; onClose(): void };

const BLANK = '';
const NAME_REQUIRED = 'Enter a page name';

function useSlugsExcept(pageId: string | null): string[] {
  const pages = useStore((state) => state.project.pages);
  const slugs: string[] = [];
  for (const id of pages.ids) {
    const page = pages.entities[id];
    if (page !== undefined && id !== pageId) slugs.push(page.slug);
  }
  return slugs;
}

export function PageDialog({ pageId, onClose }: PageDialogProps): JSX.Element {
  const pages = useStore((state) => state.project.pages);
  const editedPage = pageId === null ? undefined : pages.entities[pageId];
  const isEditing = editedPage !== undefined;
  const takenSlugs = useSlugsExcept(pageId);
  const [name, setName] = useState(editedPage?.name ?? '');
  const [typedSlug, setTypedSlug] = useState<string | null>(editedPage?.slug ?? null);
  const [sourcePageId, setSourcePageId] = useState(BLANK);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const autoSlug = name.trim() === '' ? '' : uniqueSlug(name, takenSlugs);
  const slug = typedSlug ?? autoSlug;
  const nameError = name.trim() === '' ? NAME_REQUIRED : null;
  const slugProblem = slugError(slug, takenSlugs);
  const isHome = isEditing && pageId === pages.homePageId;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog !== null && !dialog.open) dialog.showModal();
  }, []);

  function close(): void {
    dialogRef.current?.close();
  }

  function submit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setIsSubmitted(true);
    if (nameError !== null || slugProblem !== null) return;
    if (pageId !== null) {
      dispatch(pageRenamed({ pageId, name, slug }));
    } else {
      dispatch(addPage({ name, slug, sourcePageId: sourcePageId === BLANK ? null : sourcePageId }));
    }
    close();
  }

  const shownNameError = isSubmitted ? nameError : null;
  const shownSlugError = isSubmitted || typedSlug !== null ? slugProblem : null;

  return (
    <dialog
      ref={dialogRef}
      className="ve-dialog"
      aria-labelledby="ve-page-dialog-title"
      onClose={onClose}
    >
      <form className="ve-dialog-body" noValidate onSubmit={submit}>
        <h2 id="ve-page-dialog-title" className="ve-properties-title">
          {isEditing ? 'Rename page' : 'Add page'}
        </h2>
        <div className="ve-control">
          <label className="ve-control-label" htmlFor="ve-page-name">
            Name
          </label>
          <input
            id="ve-page-name"
            className="ve-input"
            value={name}
            autoFocus
            aria-invalid={shownNameError !== null}
            aria-describedby={shownNameError === null ? undefined : 've-page-name-error'}
            onChange={(event) => setName(event.target.value)}
          />
          {shownNameError !== null && (
            <p id="ve-page-name-error" className="ve-control-error" role="alert">
              {shownNameError}
            </p>
          )}
        </div>
        <div className="ve-control">
          <label className="ve-control-label" htmlFor="ve-page-slug">
            Slug
          </label>
          <input
            id="ve-page-slug"
            className="ve-input"
            value={slug}
            spellCheck={false}
            aria-invalid={shownSlugError !== null}
            aria-describedby="ve-page-slug-help"
            onChange={(event) => setTypedSlug(event.target.value)}
          />
          <p id="ve-page-slug-help" className="ve-control-help">
            {isHome
              ? 'Exported as index.html while this is the home page.'
              : `Exported as ${slug === '' ? 'page' : slug}.html.`}
          </p>
          {shownSlugError !== null && (
            <p className="ve-control-error" role="alert">
              {shownSlugError}
            </p>
          )}
        </div>
        {!isEditing && (
          <div className="ve-control">
            <label className="ve-control-label" htmlFor="ve-page-source">
              Start from
            </label>
            <select
              id="ve-page-source"
              className="ve-input"
              value={sourcePageId}
              onChange={(event) => setSourcePageId(event.target.value)}
            >
              <option value={BLANK}>Blank page</option>
              {pages.ids.map((id) => (
                <option key={id} value={id}>
                  Duplicate of {pages.entities[id]?.name}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="ve-dialog-actions">
          <button type="button" className="ve-button ve-button--outline" onClick={close}>
            Cancel
          </button>
          <button type="submit" className="ve-button ve-button--primary">
            {isEditing ? 'Save' : 'Add page'}
          </button>
        </div>
      </form>
    </dialog>
  );
}
