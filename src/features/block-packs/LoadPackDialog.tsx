import { useMemo, useRef, useState, type JSX, type SyntheticEvent } from 'react';
import { createPage } from '../../app/projectFactory';
import { store, useStore } from '../../app/store';
import type { Project } from '../../app/types';
import { compareVersions, type PackError, type ParsedPackFile } from '../../components/packFormat';
import { componentsFor, createBlock } from '../../components/registry';
import type { BlockPack, PackBlock, PackInfo } from '../../components/types';
import { renderStandalonePage } from '../../render/exportSite';
import { packCommands } from './packCommands';
import { packInLibrary } from './packLibrary';
import {
  Button,
  closeDialogOf,
  Dialog,
  Field,
  Select,
  useElementSize,
} from '../../../packages/ui/src';

const TITLE_ID = 've-load-pack-title';
const PREVIEW_PAGE_ID = 'pack-preview';
const PREVIEW_SELECT_ID = 've-pack-preview-block';
const PREVIEW_HEIGHT_PX = 320;
const PREVIEW_WIDTHS = [
  { label: 'Phone', width: 375 },
  { label: 'Tablet', width: 768 },
  { label: 'Desktop', width: 1440 },
];

type LoadPackDialogProps = { fileName: string; reading: ParsedPackFile };

type Confirmation = { label: string; isAllowed: boolean };

function previewProjectFor(project: Project, custom: PackBlock): Project {
  const page = createPage(PREVIEW_PAGE_ID, 'Preview', 'preview');
  const block = createBlock(custom.definition);
  page.blockIds = [block.id];
  return {
    ...project,
    pages: { ids: [page.id], entities: { [page.id]: page }, homePageId: page.id },
    blocks: { ids: [block.id], entities: { [block.id]: block } },
    sharedSlots: { header: [], footer: [] },
    packBlocks: { [custom.definition.id]: custom },
  };
}

function confirmationFor(info: PackInfo, existing: BlockPack | undefined): Confirmation {
  if (existing === undefined) return { label: 'Add to library', isAllowed: true };
  const order = compareVersions(info.version, existing.version);
  if (order > 0) return { label: `Update to ${info.version}`, isAllowed: true };
  if (order === 0) return { label: 'Replace', isAllowed: true };
  return { label: `Your library has the newer ${existing.version}`, isAllowed: false };
}

function rejectedCount(errors: PackError[]): number {
  const blocks = new Set<string>();
  for (const { block } of errors) {
    if (block !== null) blocks.add(block);
  }
  return blocks.size;
}

function errorPlace({ block, field, line }: PackError): string {
  const parts = [block ?? 'Pack'];
  if (field !== null) parts.push(field);
  const place = parts.join(' › ');
  return line === null ? place : `${place}, line ${line}`;
}

function PreviewFrame({
  html,
  width,
  boxWidth,
}: {
  html: string;
  width: number;
  boxWidth: number;
}): JSX.Element {
  const [contentHeight, setContentHeight] = useState(PREVIEW_HEIGHT_PX);
  const scale = boxWidth > 0 ? Math.min(1, boxWidth / width) : 1;

  function measure(event: SyntheticEvent<HTMLIFrameElement>): void {
    const height = event.currentTarget.contentDocument?.documentElement.scrollHeight;
    if (height !== undefined && height > 0) setContentHeight(height);
  }

  return (
    <div className="ve-pack-preview-box" style={{ height: contentHeight * scale }}>
      <iframe
        title={`Preview at ${width} pixels`}
        className="ve-pack-preview-frame"
        srcDoc={html}
        sandbox="allow-same-origin"
        tabIndex={-1}
        onLoad={measure}
        style={{ width, height: contentHeight, transform: `scale(${scale})` }}
      />
    </div>
  );
}

function BlockPreview({ custom }: { custom: PackBlock }): JSX.Element {
  const project = useStore((state) => state.project);
  const listRef = useRef<HTMLDivElement>(null);
  const { width: boxWidth } = useElementSize(listRef);
  const html = useMemo(() => {
    const preview = previewProjectFor(project, custom);
    return renderStandalonePage(preview, PREVIEW_PAGE_ID, componentsFor(preview), {
      shouldLinkFonts: true,
    });
  }, [project, custom]);

  return (
    <div className="ve-pack-previews" ref={listRef}>
      {PREVIEW_WIDTHS.map(({ label, width }) => (
        <figure key={width} className="ve-pack-preview">
          <figcaption className="ui-muted">
            {label} · {width} px
          </figcaption>
          <PreviewFrame html={html} width={width} boxWidth={boxWidth} />
        </figure>
      ))}
    </div>
  );
}

function PackErrors({
  errors,
  isWholePack,
}: {
  errors: PackError[];
  isWholePack: boolean;
}): JSX.Element {
  return (
    <div className="ui-dialog-note" role="note">
      <strong>{isWholePack ? 'This pack can’t be loaded' : 'These blocks can’t be loaded'}</strong>
      <ul>
        {errors.map((error, index) => (
          <li key={`${errorPlace(error)}-${index}`}>
            {errorPlace(error)}: {error.message}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function LoadPackDialog({ fileName, reading }: LoadPackDialogProps): JSX.Element {
  const { info, blocks, errors } = reading;
  const [blockId, setBlockId] = useState(blocks[0]?.definition.id ?? '');
  const existing = info === null ? undefined : packInLibrary(store.getState(), info.id);
  const shown = blocks.find(({ definition }) => definition.id === blockId) ?? blocks[0];
  const isLoadable = info !== null && blocks.length > 0;
  const confirmation = info === null ? null : confirmationFor(info, existing);
  const title = info === null ? `Can’t load ${fileName}` : `${info.name} ${info.version}`;

  return (
    <Dialog labelId={TITLE_ID} size="wide" onClose={packCommands.closeDialog}>
      <div className="ui-dialog-body ve-load-pack">
        <h2 id={TITLE_ID} className="ui-title">
          {title}
        </h2>
        {info !== null && (
          <>
            <p className="ui-muted">
              By {info.author} · {info.license} license · {blocks.length} of{' '}
              {blocks.length + rejectedCount(errors)} blocks ready
            </p>
            <p>Load packs only from people you trust: their blocks end up on your pages.</p>
          </>
        )}
        {errors.length > 0 && <PackErrors errors={errors} isWholePack={!isLoadable} />}
        {isLoadable && shown !== undefined && (
          <>
            <Field id={PREVIEW_SELECT_ID} label="Preview">
              <Select
                id={PREVIEW_SELECT_ID}
                value={shown.definition.id}
                options={blocks.map(({ definition }) => ({
                  value: definition.id,
                  label: definition.name,
                }))}
                onChange={(event) => setBlockId(event.target.value)}
              />
            </Field>
            <BlockPreview custom={shown} />
          </>
        )}
        <div className="ui-dialog-actions">
          <Button variant="secondary" onClick={(event) => closeDialogOf(event.currentTarget)}>
            Cancel
          </Button>
          {isLoadable && confirmation !== null && (
            <Button
              variant="primary"
              disabled={!confirmation.isAllowed}
              onClick={() => packCommands.confirm({ ...info, blocks, isPartial: false })}
            >
              {confirmation.label}
            </Button>
          )}
        </div>
      </div>
    </Dialog>
  );
}
