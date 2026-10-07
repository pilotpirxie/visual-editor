import type { JSX } from 'react';
import { visibleBlockLists } from '../../app/blockLists';
import type { EditKind } from '../../app/projectSlice';
import { useStore } from '../../app/store';
import { isButtonValue, isLinkValue } from '../../components/fields';
import {
  BUTTON_VARIANTS,
  type ButtonValue,
  type ButtonVariant,
  type LinkType,
  type LinkValue,
} from '../../components/types';
import type { ControlProps } from './FieldControl';

type LinkEditorProps = {
  id: string;
  label: string;
  link: LinkValue;
  describedBy: string | undefined;
  onChange(link: LinkValue, kind: EditKind): void;
};

const THIS_PAGE = '';

const LINK_TYPE_LABELS: Record<LinkType, string> = {
  page: 'Page',
  section: 'Section on a page',
  url: 'Website',
  email: 'Email',
  phone: 'Phone',
};

const LINK_TYPE_ORDER: LinkType[] = ['page', 'section', 'url', 'email', 'phone'];

const VARIANT_LABELS: Record<ButtonVariant, string> = {
  primary: 'Primary',
  secondary: 'Secondary',
  ghost: 'Ghost',
};

const ADDRESS_INPUTS: Record<
  'url' | 'email' | 'phone',
  { type: string; placeholder: string; label: string }
> = {
  url: { type: 'url', placeholder: 'https://example.com', label: 'Web address' },
  email: { type: 'email', placeholder: 'hello@example.com', label: 'Email address' },
  phone: { type: 'tel', placeholder: '+1 555 0100', label: 'Phone number' },
};

const EMPTY_LINK: LinkValue = { type: 'url', url: '', newTab: false };

function asLink(value: unknown): LinkValue {
  return isLinkValue(value) ? value : EMPTY_LINK;
}

function useAnchorsOf(pageId: string | undefined): string[] {
  const pages = useStore((state) => state.project.pages);
  const sharedSlots = useStore((state) => state.project.sharedSlots);
  const blocks = useStore((state) => state.project.blocks.entities);
  const currentPageId = useStore(
    (state) => state.editor.currentPageId ?? state.project.pages.homePageId,
  );
  const page = pages.entities[pageId ?? currentPageId];
  if (page === undefined) return [];
  const { header, page: pageBlockIds, footer } = visibleBlockLists({ sharedSlots }, page);
  const anchors: string[] = [];
  for (const blockId of [...header, ...pageBlockIds, ...footer]) {
    const anchor = blocks[blockId]?.anchor;
    if (anchor !== undefined && !anchors.includes(anchor)) anchors.push(anchor);
  }
  return anchors;
}

function linkOfType(type: LinkType, firstPageId: string | undefined): LinkValue {
  if (type === 'page') {
    return { type, pageId: firstPageId, newTab: false };
  } else if (type === 'section') {
    return { type, anchor: '', newTab: false };
  } else {
    return { type, url: '', newTab: false };
  }
}

function PagePicker({
  id,
  link,
  allowsThisPage,
  onChange,
}: {
  id: string;
  link: LinkValue;
  allowsThisPage: boolean;
  onChange: LinkEditorProps['onChange'];
}): JSX.Element {
  const pages = useStore((state) => state.project.pages);
  const isMissingPage = link.pageId !== undefined && pages.entities[link.pageId] === undefined;

  return (
    <>
      <label className="ui-field-label" htmlFor={`${id}-page`}>
        Page
      </label>
      <select
        id={`${id}-page`}
        className="ui-input ui-select"
        value={link.pageId ?? THIS_PAGE}
        onChange={(event) => {
          const pageId = event.target.value === THIS_PAGE ? undefined : event.target.value;
          onChange({ ...link, pageId }, 'discrete');
        }}
      >
        {allowsThisPage && <option value={THIS_PAGE}>This page</option>}
        {!allowsThisPage && link.pageId === undefined && (
          <option value={THIS_PAGE}>Choose a page</option>
        )}
        {pages.ids.map((pageId) => (
          <option key={pageId} value={pageId}>
            {pages.entities[pageId]?.name}
          </option>
        ))}
        {isMissingPage && <option value={link.pageId}>Deleted page</option>}
      </select>
    </>
  );
}

function SectionPicker({
  id,
  link,
  onChange,
}: {
  id: string;
  link: LinkValue;
  onChange: LinkEditorProps['onChange'];
}): JSX.Element {
  const anchors = useAnchorsOf(link.pageId);
  const anchor = link.anchor ?? '';
  const isUnlisted = anchor !== '' && !anchors.includes(anchor);

  return (
    <>
      <label className="ui-field-label" htmlFor={`${id}-section`}>
        Section
      </label>
      <select
        id={`${id}-section`}
        className="ui-input ui-select"
        value={anchor}
        onChange={(event) => onChange({ ...link, anchor: event.target.value }, 'discrete')}
      >
        <option value="">Top of the page</option>
        {anchors.map((name) => (
          <option key={name} value={name}>
            #{name}
          </option>
        ))}
        {isUnlisted && <option value={anchor}>#{anchor} (not on this page)</option>}
      </select>
      {anchors.length === 0 && <p className="ui-muted">No block on this page has an anchor id.</p>}
    </>
  );
}

function AddressInput({
  id,
  link,
  type,
  onChange,
}: {
  id: string;
  link: LinkValue;
  type: 'url' | 'email' | 'phone';
  onChange: LinkEditorProps['onChange'];
}): JSX.Element {
  const input = ADDRESS_INPUTS[type];
  return (
    <>
      <label className="ui-field-label" htmlFor={`${id}-address`}>
        {input.label}
      </label>
      <input
        id={`${id}-address`}
        className="ui-input"
        type={input.type}
        placeholder={input.placeholder}
        spellCheck={false}
        value={link.url ?? ''}
        onChange={(event) => onChange({ ...link, url: event.target.value }, 'continuous')}
      />
      {type === 'url' && (
        <label className="ui-check">
          <input
            type="checkbox"
            checked={link.newTab}
            onChange={(event) => onChange({ ...link, newTab: event.target.checked }, 'discrete')}
          />
          Open in a new tab
        </label>
      )}
    </>
  );
}

function LinkEditor({ id, label, link, describedBy, onChange }: LinkEditorProps): JSX.Element {
  const firstPageId = useStore((state) => state.project.pages.ids[0]);

  return (
    <fieldset className="ve-link" aria-describedby={describedBy}>
      <legend className="ui-field-label">{label}</legend>
      <label className="ve-visually-hidden" htmlFor={`${id}-type`}>
        {label}: link to
      </label>
      <select
        id={`${id}-type`}
        className="ui-input ui-select"
        value={link.type}
        onChange={(event) => {
          const type = LINK_TYPE_ORDER.find((known) => known === event.target.value);
          if (type !== undefined) onChange(linkOfType(type, firstPageId), 'discrete');
        }}
      >
        {LINK_TYPE_ORDER.map((type) => (
          <option key={type} value={type}>
            {LINK_TYPE_LABELS[type]}
          </option>
        ))}
      </select>
      {link.type === 'page' && (
        <PagePicker id={id} link={link} allowsThisPage={false} onChange={onChange} />
      )}
      {link.type === 'section' && (
        <>
          <PagePicker id={id} link={link} allowsThisPage onChange={onChange} />
          <SectionPicker id={id} link={link} onChange={onChange} />
        </>
      )}
      {(link.type === 'url' || link.type === 'email' || link.type === 'phone') && (
        <AddressInput id={id} link={link} type={link.type} onChange={onChange} />
      )}
    </fieldset>
  );
}

export function LinkField({ field, value, id, describedBy, onChange }: ControlProps): JSX.Element {
  return (
    <LinkEditor
      id={id}
      label={field.label}
      link={asLink(value)}
      describedBy={describedBy}
      onChange={onChange}
    />
  );
}

function asButton(value: unknown): ButtonValue {
  if (isButtonValue(value)) return value;
  return { label: '', link: EMPTY_LINK, variant: 'primary' };
}

export function ButtonField({
  field,
  value,
  id,
  describedBy,
  isInvalid,
  onChange,
}: ControlProps): JSX.Element {
  const button = asButton(value);

  return (
    <fieldset className="ve-button-field" aria-describedby={describedBy}>
      <legend className="ui-field-label">{field.label}</legend>
      <label className="ui-field-label" htmlFor={`${id}-label`}>
        Label
      </label>
      <input
        id={`${id}-label`}
        className="ui-input"
        value={button.label}
        aria-invalid={isInvalid}
        onChange={(event) => onChange({ ...button, label: event.target.value }, 'continuous')}
      />
      <LinkEditor
        id={`${id}-link`}
        label="Link"
        link={button.link}
        describedBy={undefined}
        onChange={(link, kind) => onChange({ ...button, link }, kind)}
      />
      <label className="ui-field-label" htmlFor={`${id}-variant`}>
        Style
      </label>
      <select
        id={`${id}-variant`}
        className="ui-input ui-select"
        value={button.variant}
        onChange={(event) => {
          const variant = BUTTON_VARIANTS.find((known) => known === event.target.value);
          if (variant !== undefined) onChange({ ...button, variant }, 'discrete');
        }}
      >
        {BUTTON_VARIANTS.map((variant) => (
          <option key={variant} value={variant}>
            {VARIANT_LABELS[variant]}
          </option>
        ))}
      </select>
    </fieldset>
  );
}
