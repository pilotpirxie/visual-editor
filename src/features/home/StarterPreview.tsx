import { useRef, useState, type JSX, type SyntheticEvent } from 'react';
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
  const shown = withPreset(project, presetId);
  const fit = fitDevice(DEVICE_VIEWPORTS[device], available);
  const html = renderStandalonePage(shown, pageId, builtInComponents, { shouldLinkFonts: false });
  const pageSlugs = pageSlugsOf(project.pages);

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

  function handleFrameLoad(event: SyntheticEvent<HTMLIFrameElement>): void {
    const doc = event.currentTarget.contentDocument;
    if (doc === null) return;
    const fontsHref = googleFontsHref(shown.designSystem.fonts);
    if (fontsHref !== null) {
      const fontsLink = doc.createElement('link');
      fontsLink.rel = 'stylesheet';
      fontsLink.href = fontsHref;
      doc.head.append(fontsLink);
    }
    const anchor = pendingAnchorRef.current;
    pendingAnchorRef.current = null;
    if (anchor !== null) doc.getElementById(anchor)?.scrollIntoView();
    doc.addEventListener('submit', (submit) => submit.preventDefault());
    doc.addEventListener('click', (click) => {
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
    });
  }

  const pageOptions = [];
  for (const id of project.pages.ids) {
    pageOptions.push({ value: id, label: project.pages.entities[id]?.name ?? id });
  }
  const presetOptions = [];
  for (const preset of BUILTIN_PRESETS)
    presetOptions.push({ value: preset.id, label: preset.name });

  return (
    <Dialog labelId={TITLE_ID} size="full" className="ve-starter-preview" onClose={onClose}>
      <div className="ve-starter-preview-body">
        <header className="ve-starter-preview-bar">
          <Title id={TITLE_ID}>{starter.name}</Title>
          <Field id="ve-starter-page" label="Page" layout="inline" className="ve-starter-field">
            <Select
              id="ve-starter-page"
              value={pageId}
              options={pageOptions}
              onChange={(event) => setPageId(event.target.value)}
            />
          </Field>
          <DeviceToggle
            name="ve-starter-device"
            value={device}
            modes={STARTER_DEVICES}
            onChange={(mode) => setDevice(mode)}
          />
          <Field id="ve-starter-design" label="Design" layout="inline" className="ve-starter-field">
            <Select
              id="ve-starter-design"
              value={presetId}
              options={presetOptions}
              onChange={(event) => void choosePreset(event.target.value)}
            />
          </Field>
          <div className="ve-starter-preview-actions">
            <Button onClick={(event) => closeDialogOf(event.currentTarget)}>Close</Button>
            <Button variant="primary" disabled={isDisabled} onClick={() => onUse(shown)}>
              Use this starter
            </Button>
          </div>
        </header>
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
