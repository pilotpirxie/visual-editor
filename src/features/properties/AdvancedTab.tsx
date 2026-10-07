import { useState, type JSX, type ReactNode } from 'react';
import { visibleBlockLists } from '../../app/blockLists';
import { conversionRequested } from '../../app/editorSlice';
import { blockAdvancedSet } from '../../app/projectSlice';
import { dispatch, selectCurrentPage, useStore } from '../../app/store';
import { DEVICES, type Block, type Device } from '../../app/types';
import { isValidAnchor, isValidClassName, parseClassNames } from '../../render/attributes';
import { useSection } from '../editor/useSection';
import {
  Button,
  Checkbox,
  DraftInput,
  Field,
  fieldErrorId,
  Section,
  TextInput,
} from '../../../packages/ui/src';

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
    <div data-field-path="advanced.anchor">
      <Field id={id} label="Anchor id">
        <span className="ve-prefixed-input">
          <span aria-hidden="true">#</span>
          <DraftInput
            id={id}
            value={block.anchor ?? ''}
            validate={validate}
            onCommit={(text) =>
              dispatch(blockAdvancedSet(block.id, { key: 'anchor', value: text }, 'continuous'))
            }
          />
        </span>
      </Field>
    </div>
  );
}

function ClassesControl({ block }: { block: Block }): JSX.Element {
  const stored = block.extraClasses.join(' ');
  const [draft, setDraft] = useState<ClassesDraft | null>(null);
  const activeDraft = draft !== null && draft.base === stored ? draft : null;
  const id = 've-advanced-classes';

  function change(text: string): void {
    const names = parseClassNames(text);
    if (!names.every(isValidClassName)) {
      setDraft({ text, base: stored, error: CLASS_NAME_ERROR });
      return;
    }
    setDraft({ text, base: names.join(' '), error: null });
    dispatch(blockAdvancedSet(block.id, { key: 'extraClasses', value: names }, 'continuous'));
  }

  const error = activeDraft === null ? null : activeDraft.error;

  return (
    <div data-field-path="advanced.extraClasses">
      <Field id={id} label="Extra CSS classes" error={error}>
        <TextInput
          id={id}
          spellCheck={false}
          value={activeDraft === null ? stored : activeDraft.text}
          isInvalid={error !== null}
          aria-describedby={error === null ? undefined : fieldErrorId(id)}
          onChange={(event) => change(event.target.value)}
        />
      </Field>
    </div>
  );
}

function HideOnControl({ block }: { block: Block }): JSX.Element {
  function toggle(device: Device, isChecked: boolean): void {
    const devices = isChecked
      ? [...block.hideOn, device]
      : block.hideOn.filter((hidden) => hidden !== device);
    dispatch(blockAdvancedSet(block.id, { key: 'hideOn', value: devices }, 'discrete'));
  }

  return (
    <fieldset className="ve-hide-on">
      <legend className="ui-legend">Hide on</legend>
      <div className="ve-hide-on-options">
        {DEVICES.map((device) => (
          <Checkbox
            key={device}
            label={DEVICE_LABELS[device]}
            checked={block.hideOn.includes(device)}
            onChange={(event) => toggle(device, event.target.checked)}
          />
        ))}
      </div>
    </fieldset>
  );
}

function AdvancedSection({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}): JSX.Element {
  const section = useSection(`advanced:${id}`);
  return (
    <Section title={title} isOpen={section.isOpen} onToggle={section.onToggle}>
      {children}
    </Section>
  );
}

export function AdvancedTab({ block }: { block: Block }): JSX.Element {
  return (
    <>
      <AdvancedSection id="attributes" title="Anchor and classes">
        <AnchorControl block={block} />
        <ClassesControl block={block} />
      </AdvancedSection>
      <AdvancedSection id="visibility" title="Visibility">
        <HideOnControl block={block} />
      </AdvancedSection>
      {block.kind === 'component' && (
        <AdvancedSection id="convert" title="Code">
          <Button
            icon="code"
            className="ve-convert-button"
            onClick={() => dispatch(conversionRequested(block.id))}
          >
            Convert to HTML…
          </Button>
        </AdvancedSection>
      )}
    </>
  );
}
