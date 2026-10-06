import { useState, type JSX } from 'react';
import { visibleBlockLists } from '../../app/blockLists';
import { blockAdvancedSet } from '../../app/projectSlice';
import { dispatch, selectCurrentPage, useStore } from '../../app/store';
import { DEVICES, type Block, type Device } from '../../app/types';
import { isValidAnchor, isValidClassName, parseClassNames } from '../../render/attributes';
import { DraftInput } from './DraftInput';

type ClassesDraft = { text: string; base: string; error: string | null };

const DEVICE_LABELS: Record<Device, string> = {
  phone: 'Phone',
  tablet: 'Tablet',
  desktop: 'Desktop',
};

const ANCHOR_FORMAT_ERROR = 'Use lowercase letters, digits and hyphens, starting with a letter';
const CLASS_NAME_ERROR =
  'Class names use letters, digits, hyphens and underscores, and cannot start with a digit';

function useAnchorsOnPage(blockId: string): string[] {
  const page = useStore(selectCurrentPage);
  const sharedSlots = useStore((state) => state.project.sharedSlots);
  const blocks = useStore((state) => state.project.blocks.entities);
  const { header, page: pageBlockIds, footer } = visibleBlockLists({ sharedSlots }, page);
  const anchors: string[] = [];
  for (const id of [...header, ...pageBlockIds, ...footer]) {
    const anchor = blocks[id]?.anchor;
    if (id !== blockId && anchor !== undefined) anchors.push(anchor);
  }
  return anchors;
}

function AnchorControl({ block }: { block: Block }): JSX.Element {
  const takenAnchors = useAnchorsOnPage(block.id);
  const id = 've-advanced-anchor';

  function validate(text: string): string | null {
    const anchor = text.trim();
    if (anchor === '') {
      return null;
    } else if (!isValidAnchor(anchor)) {
      return ANCHOR_FORMAT_ERROR;
    } else if (takenAnchors.includes(anchor)) {
      return `Another block on this page already uses #${anchor}`;
    } else {
      return null;
    }
  }

  return (
    <div className="ve-control" data-field-path="advanced.anchor">
      <label className="ve-control-label" htmlFor={id}>
        Anchor id
      </label>
      <div className="ve-prefixed-input">
        <span aria-hidden="true">#</span>
        <DraftInput
          id={id}
          label="Anchor id"
          value={block.anchor ?? ''}
          validate={validate}
          onCommit={(text) =>
            dispatch(blockAdvancedSet(block.id, { key: 'anchor', value: text }, 'continuous'))
          }
        />
      </div>
      <p className="ve-control-help">Links can jump to this block, for example #pricing.</p>
    </div>
  );
}

function ClassesControl({ block }: { block: Block }): JSX.Element {
  const stored = block.extraClasses.join(' ');
  const [draft, setDraft] = useState<ClassesDraft | null>(null);
  const activeDraft = draft !== null && draft.base === stored ? draft : null;
  const id = 've-advanced-classes';
  const errorId = `${id}-error`;

  function change(text: string): void {
    const names = parseClassNames(text);
    if (!names.every(isValidClassName)) {
      setDraft({ text, base: stored, error: CLASS_NAME_ERROR });
      return;
    }
    setDraft({ text, base: names.join(' '), error: null });
    dispatch(blockAdvancedSet(block.id, { key: 'extraClasses', value: names }, 'continuous'));
  }

  return (
    <div className="ve-control" data-field-path="advanced.extraClasses">
      <label className="ve-control-label" htmlFor={id}>
        Extra CSS classes
      </label>
      <input
        id={id}
        className="ve-input"
        type="text"
        spellCheck={false}
        value={activeDraft === null ? stored : activeDraft.text}
        aria-invalid={activeDraft?.error != null}
        aria-describedby={activeDraft?.error == null ? `${id}-help` : errorId}
        onChange={(event) => change(event.target.value)}
      />
      <p id={`${id}-help`} className="ve-control-help">
        Separate classes with spaces.
      </p>
      {activeDraft !== null && activeDraft.error !== null && (
        <p id={errorId} className="ve-control-error" role="alert">
          {activeDraft.error}
        </p>
      )}
    </div>
  );
}

function HideOnControl({ block }: { block: Block }): JSX.Element {
  const isHiddenEverywhere = block.hideOn.length === DEVICES.length;

  function toggle(device: Device, isChecked: boolean): void {
    const devices = isChecked
      ? [...block.hideOn, device]
      : block.hideOn.filter((hidden) => hidden !== device);
    dispatch(blockAdvancedSet(block.id, { key: 'hideOn', value: devices }, 'discrete'));
  }

  return (
    <fieldset className="ve-hide-on" aria-describedby="ve-advanced-hide-help">
      <legend className="ve-control-label">Hide on</legend>
      <div className="ve-hide-on-options">
        {DEVICES.map((device) => (
          <label key={device} className="ve-check">
            <input
              type="checkbox"
              checked={block.hideOn.includes(device)}
              onChange={(event) => toggle(device, event.target.checked)}
            />
            {DEVICE_LABELS[device]}
          </label>
        ))}
      </div>
      <p id="ve-advanced-hide-help" className="ve-control-help">
        {isHiddenEverywhere
          ? 'Hidden on every screen size. To leave it out of the export, disable it in Layers.'
          : 'The block stays in the export and is hidden on these screen sizes.'}
      </p>
    </fieldset>
  );
}

export function AdvancedTab({ block }: { block: Block }): JSX.Element {
  return (
    <section className="ve-properties-section">
      <AnchorControl block={block} />
      <ClassesControl block={block} />
      <HideOnControl block={block} />
    </section>
  );
}
