import { useState, type FormEvent, type JSX } from 'react';
import { pageRenamed } from '../../app/projectSlice';
import { slugError, uniqueSlug } from '../../app/slugs';
import { dispatch, useStore } from '../../app/store';
import type { Page } from '../../app/types';
import { addPage } from './pageActions';
import {
  Button,
  closeDialogOf,
  Dialog,
  DialogActions,
  DialogBody,
  Field,
  fieldErrorId,
  Select,
  TextInput,
} from '../../../packages/ui/src';

type PageDialogProps = { pageId: string | null; onClose(): void };

const BLANK = '';
const TITLE_ID = 've-page-dialog-title';
const NAME_REQUIRED = 'Enter a page name';

type PageList = { ids: string[]; entities: Record<string, Page | undefined> };

type PageForm = {
  slug: string;
  nameError: string | null;
  slugError: string | null;
  shownNameError: string | null;
  shownSlugError: string | null;
};

function slugsExcept(pages: PageList, pageId: string | null): string[] {
  const slugs: string[] = [];
  for (const id of pages.ids) {
    const page = pages.entities[id];
    if (page !== undefined && id !== pageId) slugs.push(page.slug);
  }
  return slugs;
}

function sourceOptionsOf(pages: PageList): { value: string; label: string }[] {
  const options = [{ value: BLANK, label: 'Blank page' }];
  for (const id of pages.ids) {
    options.push({ value: id, label: `Duplicate of ${pages.entities[id]?.name ?? id}` });
  }
  return options;
}

function pageFormOf(
  name: string,
  typedSlug: string | null,
  takenSlugs: readonly string[],
  isSubmitted: boolean,
): PageForm {
  const isNameEmpty = name.trim() === '';
  const slug = typedSlug ?? (isNameEmpty ? '' : uniqueSlug(name, takenSlugs));
  const nameError = isNameEmpty ? NAME_REQUIRED : null;
  const slugProblem = slugError(slug, takenSlugs);
  return {
    slug,
    nameError,
    slugError: slugProblem,
    shownNameError: isSubmitted ? nameError : null,
    shownSlugError: isSubmitted || typedSlug !== null ? slugProblem : null,
  };
}

export function PageDialog({ pageId, onClose }: PageDialogProps): JSX.Element {
  const pages = useStore((state) => state.project.pages);
  const editedPage = pageId === null ? undefined : pages.entities[pageId];
  const isEditing = editedPage !== undefined;
  const [name, setName] = useState(editedPage?.name ?? '');
  const [typedSlug, setTypedSlug] = useState<string | null>(editedPage?.slug ?? null);
  const [sourcePageId, setSourcePageId] = useState(BLANK);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const form = pageFormOf(name, typedSlug, slugsExcept(pages, pageId), isSubmitted);
  const { slug, shownNameError, shownSlugError } = form;

  function submit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setIsSubmitted(true);
    if (form.nameError !== null || form.slugError !== null) return;
    if (pageId !== null) {
      dispatch(pageRenamed({ pageId, name, slug }));
    } else {
      dispatch(addPage({ name, slug, sourcePageId: sourcePageId === BLANK ? null : sourcePageId }));
    }
    closeDialogOf(event.currentTarget);
  }

  return (
    <Dialog labelId={TITLE_ID} onClose={onClose}>
      <DialogBody
        titleId={TITLE_ID}
        title={isEditing ? 'Rename page' : 'Add page'}
        onSubmit={submit}
      >
        <Field id="ve-page-name" label="Name" error={shownNameError}>
          <TextInput
            id="ve-page-name"
            value={name}
            autoFocus
            isInvalid={shownNameError !== null}
            aria-describedby={shownNameError === null ? undefined : fieldErrorId('ve-page-name')}
            onChange={(event) => setName(event.target.value)}
          />
        </Field>
        <Field id="ve-page-slug" label="Slug" error={shownSlugError}>
          <TextInput
            id="ve-page-slug"
            value={slug}
            spellCheck={false}
            isInvalid={shownSlugError !== null}
            aria-describedby={shownSlugError === null ? undefined : fieldErrorId('ve-page-slug')}
            onChange={(event) => setTypedSlug(event.target.value)}
          />
        </Field>
        {!isEditing && (
          <Field id="ve-page-source" label="Start from">
            <Select
              id="ve-page-source"
              value={sourcePageId}
              options={sourceOptionsOf(pages)}
              onChange={(event) => setSourcePageId(event.target.value)}
            />
          </Field>
        )}
        <DialogActions>
          <Button onClick={(event) => closeDialogOf(event.currentTarget)}>Cancel</Button>
          <Button type="submit" variant="primary">
            {isEditing ? 'Save' : 'Add page'}
          </Button>
        </DialogActions>
      </DialogBody>
    </Dialog>
  );
}
