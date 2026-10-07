import { useRef, useState, type JSX, type SyntheticEvent } from 'react';
import { DEVICE_VIEWPORTS, noticeShown } from '../../app/editorSlice';
import { dispatch } from '../../app/store';
import type { Device, Project } from '../../app/types';
import { registry } from '../../components/registry';
import { applyPreset, BUILTIN_PRESETS, PRESET_GROUPS } from '../../presets/presets';
import { renderStandalonePage } from '../../render/exportSite';
import { googleFontsHref } from '../../render/fonts';
import { pageSlugsOf } from '../../render/renderBlock';
import { useElementSize } from '../canvas/Canvas';
import { isElementTarget } from '../canvas/frameDom';
import { fitDevice } from '../canvas/geometry';
import { canvasLinkTarget } from '../canvas/links';
import { closeDialogOf, Dialog } from '../editor/Dialog';
import { Icon } from '../editor/Icon';
import { ensureIconSets } from '../icons/ensureIconSets';
import type { StarterInfo } from '../../starters/starters';

const TITLE_ID = 've-starter-preview-title';

const DEVICES: { id: Device; label: string; icon: string }[] = [
  { id: 'desktop', label: 'Desktop', icon: 'monitor' },
  { id: 'tablet', label: 'Tablet', icon: 'tablet' },
  { id: 'phone', label: 'Phone', icon: 'smartphone' },
];

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
  const available = useElementSize(viewportRef);
  const shown = withPreset(project, presetId);
  const fit = fitDevice(DEVICE_VIEWPORTS[device], available);
  const html = renderStandalonePage(shown, pageId, registry, { shouldLinkFonts: false });
  const pageSlugs = pageSlugsOf(project.pages);

  async function choosePreset(nextPresetId: string): Promise<void> {
    const preset = BUILTIN_PRESETS.find((item) => item.id === nextPresetId);
    if (preset === undefined) return;
    try {
      await ensureIconSets([preset.designSystem.iconSet]);
    } catch (error) {
      console.error(`Could not load the icons of the ${preset.name} preset`, error);
      dispatch(noticeShown('error', `The ${preset.name} design could not be loaded.`));
      return;
    }
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

  return (
    <Dialog labelId={TITLE_ID} className="ve-starter-preview" onClose={onClose}>
      <div className="ve-starter-preview-body">
        <header className="ve-starter-preview-bar">
          <h2 id={TITLE_ID} className="ve-properties-title">
            {starter.name}
          </h2>
          <label className="ve-starter-field">
            <span>Page</span>
            <select
              className="ve-input"
              value={pageId}
              onChange={(event) => setPageId(event.target.value)}
            >
              {project.pages.ids.map((id) => (
                <option key={id} value={id}>
                  {project.pages.entities[id]?.name}
                </option>
              ))}
            </select>
          </label>
          <div className="ve-toolbar-group" role="group" aria-label="Device">
            {DEVICES.map((option) => (
              <button
                key={option.id}
                type="button"
                className="ve-device-button"
                aria-pressed={device === option.id}
                aria-label={option.label}
                title={option.label}
                onClick={() => setDevice(option.id)}
              >
                <Icon name={option.icon} />
              </button>
            ))}
          </div>
          <label className="ve-starter-field">
            <span>Design</span>
            <select
              className="ve-input"
              value={presetId}
              onChange={(event) => void choosePreset(event.target.value)}
            >
              {BUILTIN_PRESETS.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.name}
                </option>
              ))}
            </select>
          </label>
          <div className="ve-starter-preview-actions">
            <button
              type="button"
              className="ve-button ve-button--outline"
              onClick={(event) => closeDialogOf(event.currentTarget)}
            >
              Close
            </button>
            <button
              type="button"
              className="ve-button ve-button--primary"
              disabled={isDisabled}
              onClick={() => onUse(shown)}
            >
              Use this starter
            </button>
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
