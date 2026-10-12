import { useMemo, useRef, useState, type JSX, type SyntheticEvent } from 'react';
import { DEVICE_VIEWPORTS, noticeShown } from '../../app/editorSlice';
import { dispatch } from '../../app/store';
import type { Device, Project } from '../../app/types';
import { builtInComponents } from '../../components/registry';
import { applyPreset, BUILTIN_PRESETS, PRESET_GROUPS } from '../../presets/presets';
import { renderStandalonePage } from '../../render/exportSite';
import { googleFontsHref } from '../../render/fonts';
import { pageSlugsOf } from '../../render/renderBlock';
import { isElementTarget } from '../canvas/frameDom';
import { fitDevice } from '../canvas/geometry';
import { canvasLinkTarget } from '../canvas/links';
import { ensureIconSets } from '../icons/ensureIconSets';
import type { StarterInfo } from '../../starters/starters';
import {
  Button,
  closeDialogOf,
  Dialog,
  Field,
  Select,
  Title,
  useElementSize,
} from '../../../packages/ui/src';
import { DeviceToggle } from '../editor/DeviceToggle';

const TITLE_ID = 've-starter-preview-title';

const STARTER_DEVICES: Device[] = ['desktop', 'tablet', 'phone'];

type StarterPreviewProps = {
  starter: StarterInfo;
  project: Project;
  isDisabled: boolean;
  onUse(shown: Project): void;
  onClose(): void;
};

function withPreset(project: Project, presetId: string): Project {
  const preset = BUILTIN_PRESETS.find((item) => item.id === presetId);
  if (preset === undefined || preset.id === project.designSystem.presetId) return project;
  return { ...project, designSystem: applyPreset(project.designSystem, preset, PRESET_GROUPS) };
}

type Option = { value: string; label: string };

const PRESET_OPTIONS: Option[] = BUILTIN_PRESETS.map((preset) => ({
  value: preset.id,
  label: preset.name,
}));

function pageOptionsOf(project: Project): Option[] {
  const options: Option[] = [];
  for (const id of project.pages.ids) {
    options.push({ value: id, label: project.pages.entities[id]?.name ?? id });
  }
  return options;
}

function linkFonts(doc: Document, project: Project): void {
  const fontsHref = googleFontsHref(project.designSystem.fonts);
  if (fontsHref === null) return;
  const fontsLink = doc.createElement('link');
  fontsLink.rel = 'stylesheet';
  fontsLink.href = fontsHref;
  doc.head.append(fontsLink);
}

type PreviewBarProps = {
  starterName: string;
  pageId: string;
  pageOptions: Option[];
  device: Device;
  presetId: string;
  isDisabled: boolean;
  onPage(pageId: string): void;
  onDevice(device: Device): void;
  onPreset(presetId: string): void;
  onUse(): void;
};

function PreviewBar({
  starterName,
  pageId,
  pageOptions,
  device,
  presetId,
  isDisabled,
  onPage,
  onDevice,
  onPreset,
  onUse,
}: PreviewBarProps): JSX.Element {
  return (
    <header className="ve-starter-preview-bar">
      <Title id={TITLE_ID}>{starterName}</Title>
      <Field id="ve-starter-page" label="Page" layout="inline" className="ve-starter-field">
        <Select
          id="ve-starter-page"
          value={pageId}
          options={pageOptions}
          onChange={(event) => onPage(event.target.value)}
        />
      </Field>
      <DeviceToggle
        name="ve-starter-device"
        value={device}
        modes={STARTER_DEVICES}
        onChange={(mode) => onDevice(mode)}
      />
      <Field id="ve-starter-design" label="Design" layout="inline" className="ve-starter-field">
        <Select
          id="ve-starter-design"
          value={presetId}
          options={PRESET_OPTIONS}
          onChange={(event) => onPreset(event.target.value)}
        />
      </Field>
      <div className="ve-starter-preview-actions">
        <Button onClick={(event) => closeDialogOf(event.currentTarget)}>Close</Button>
        <Button variant="primary" disabled={isDisabled} onClick={onUse}>
          Use this starter
        </Button>
      </div>
    </header>
  );
}

export function StarterPreview({
  starter,
  project,
  isDisabled,
  onUse,
  onClose,
}: StarterPreviewProps): JSX.Element {
  const [pageId, setPageId] = useState(project.pages.homePageId);
  const [device, setDevice] = useState<Device>('desktop');
  const [presetId, setPresetId] = useState(starter.presetId);
  const viewportRef = useRef<HTMLDivElement>(null);
  const pendingAnchorRef = useRef<string | null>(null);
  const requestedPresetIdRef = useRef(starter.presetId);
  const available = useElementSize(viewportRef);
  const shown = useMemo(() => withPreset(project, presetId), [project, presetId]);
  const fit = fitDevice(DEVICE_VIEWPORTS[device], available);
  const html = useMemo(
    () => renderStandalonePage(shown, pageId, builtInComponents, { shouldLinkFonts: false }),
    [shown, pageId],
  );
  const pageSlugs = useMemo(() => pageSlugsOf(project.pages), [project.pages]);

  async function choosePreset(nextPresetId: string): Promise<void> {
    const preset = BUILTIN_PRESETS.find((item) => item.id === nextPresetId);
    if (preset === undefined) return;
    requestedPresetIdRef.current = nextPresetId;
    try {
      await ensureIconSets([preset.designSystem.iconSet]);
    } catch (error) {
      console.error(`Could not load the icons of the ${preset.name} preset`, error);
      dispatch(noticeShown('error', `The ${preset.name} design could not be loaded.`));
      return;
    }
    if (requestedPresetIdRef.current !== nextPresetId) return;
    setPresetId(nextPresetId);
  }

  function followLink(doc: Document, click: MouseEvent): void {
    const link = isElementTarget(click.target) ? click.target.closest('a[href]') : null;
    if (link === null) return;
    click.preventDefault();
    const destination = canvasLinkTarget(link.getAttribute('href'), pageSlugs);
    if (destination.kind === 'section') {
      doc.getElementById(destination.anchor)?.scrollIntoView({ behavior: 'smooth' });
    } else if (destination.kind === 'page' && destination.pageId === pageId) {
      if (destination.anchor !== null) doc.getElementById(destination.anchor)?.scrollIntoView();
    } else if (destination.kind === 'page') {
      pendingAnchorRef.current = destination.anchor;
      setPageId(destination.pageId);
    }
  }

  function handleFrameLoad(event: SyntheticEvent<HTMLIFrameElement>): void {
    const doc = event.currentTarget.contentDocument;
    if (doc === null) return;
    linkFonts(doc, shown);
    const anchor = pendingAnchorRef.current;
    pendingAnchorRef.current = null;
    if (anchor !== null) doc.getElementById(anchor)?.scrollIntoView();
    doc.addEventListener('submit', (submit) => submit.preventDefault());
    doc.addEventListener('click', (click) => followLink(doc, click));
  }

  return (
    <Dialog labelId={TITLE_ID} size="full" className="ve-starter-preview" onClose={onClose}>
      <div className="ve-starter-preview-body">
        <PreviewBar
          starterName={starter.name}
          pageId={pageId}
          pageOptions={pageOptionsOf(project)}
          device={device}
          presetId={presetId}
          isDisabled={isDisabled}
          onPage={setPageId}
          onDevice={setDevice}
          onPreset={(nextPresetId) => void choosePreset(nextPresetId)}
          onUse={() => onUse(shown)}
        />
        <div className="ve-starter-viewport" ref={viewportRef}>
          <div
            className="ve-starter-device"
            style={{ width: fit.box.width, height: fit.box.height }}
          >
            <iframe
              key={`${pageId}-${presetId}`}
              className="ve-starter-frame"
              title={`${starter.name} preview`}
              srcDoc={html}
              onLoad={handleFrameLoad}
              style={{
                width: fit.frame.width,
                height: fit.frame.height,
                transform: `scale(${fit.scale})`,
              }}
            />
          </div>
        </div>
      </div>
    </Dialog>
  );
}
