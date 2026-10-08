import { useEffect, useMemo, useRef, useState, type JSX } from 'react';
import { describeError } from '../../app/errors';
import type { Project } from '../../app/types';
import { builtInComponents } from '../../components/registry';
import { renderStandalonePage } from '../../render/exportSite';
import {
  loadStarter,
  STARTER_USE_CASES,
  STARTERS,
  type StarterInfo,
  type StarterUseCase,
} from '../../starters/starters';
import { ensureProjectIconSets } from '../icons/ensureIconSets';
import { StarterPreview } from './StarterPreview';
import { Button, SegmentedControl, useElementSize } from '../../../packages/ui/src';

const THUMBNAIL_WIDTH = 1440;
const THUMBNAIL_HEIGHT = 900;

type LoadedStarter = { starter: StarterInfo; project: Project };

type UseCaseFilter = StarterUseCase | 'all';

const ALL_USE_CASES = 'all';

const USE_CASE_OPTIONS = [
  { value: ALL_USE_CASES, label: 'All' },
  ...STARTER_USE_CASES.map(({ id, label }) => ({ value: id, label })),
];

function filterFromValue(value: string): UseCaseFilter {
  return STARTER_USE_CASES.find(({ id }) => id === value)?.id ?? ALL_USE_CASES;
}

function startersFor(starters: LoadedStarter[], filter: UseCaseFilter): LoadedStarter[] {
  if (filter === ALL_USE_CASES) return starters;
  const shown: LoadedStarter[] = [];
  for (const loaded of starters) {
    if (loaded.starter.useCase === filter) shown.push(loaded);
  }
  return shown;
}

type StarterGalleryProps = {
  isDisabled: boolean;
  onUse(starter: StarterInfo, project: Project): void;
};

async function loadStarterWithIcons(starter: StarterInfo): Promise<LoadedStarter> {
  const project = await loadStarter(starter);
  await ensureProjectIconSets(project);
  return { starter, project };
}

function pageNamesOf(project: Project): string[] {
  const names: string[] = [];
  for (const id of project.pages.ids) {
    const page = project.pages.entities[id];
    if (page !== undefined) names.push(page.name);
  }
  return names;
}

function StarterThumbnail({ project }: { project: Project }): JSX.Element {
  const boxRef = useRef<HTMLDivElement>(null);
  const { width } = useElementSize(boxRef);
  const html = useMemo(
    () =>
      renderStandalonePage(project, project.pages.homePageId, builtInComponents, {
        shouldLinkFonts: true,
      }),
    [project],
  );
  return (
    <div className="ve-starter-thumbnail" ref={boxRef}>
      <iframe
        sandbox=""
        srcDoc={html}
        loading="lazy"
        tabIndex={-1}
        aria-hidden="true"
        style={{
          width: THUMBNAIL_WIDTH,
          height: THUMBNAIL_HEIGHT,
          transform: `scale(${width / THUMBNAIL_WIDTH})`,
        }}
      />
    </div>
  );
}

export function StarterGallery({ isDisabled, onUse }: StarterGalleryProps): JSX.Element {
  const [starters, setStarters] = useState<LoadedStarter[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState<LoadedStarter | null>(null);
  const [useCase, setUseCase] = useState<UseCaseFilter>(ALL_USE_CASES);

  useEffect(() => {
    let isCancelled = false;
    async function load(): Promise<void> {
      try {
        const loaded = await Promise.all(STARTERS.map(loadStarterWithIcons));
        if (!isCancelled) setStarters(loaded);
      } catch (loadError) {
        console.error('Could not load the starter projects', loadError);
        if (!isCancelled) setError(describeError(loadError));
      }
    }
    void load();
    return () => {
      isCancelled = true;
    };
  }, []);

  if (error !== null) {
    return (
      <p className="ui-field-error" role="alert">
        Could not load the starters: {error}
      </p>
    );
  }
  if (starters === null) {
    return (
      <p className="ui-muted" role="status">
        Loading starters…
      </p>
    );
  }

  return (
    <>
      <SegmentedControl
        legend="Use case"
        name="ve-starter-use-case"
        className="ve-starter-filter"
        options={USE_CASE_OPTIONS}
        value={useCase}
        onChange={(value) => setUseCase(filterFromValue(value))}
      />
      <ul className="ve-starter-grid" aria-label="Starters">
        {startersFor(starters, useCase).map((loaded) => {
          const { starter, project } = loaded;
          return (
            <li key={starter.id} className="ve-starter-card">
              <StarterThumbnail project={project} />
              <h3 className="ve-starter-name">{starter.name}</h3>
              <p className="ui-muted">{starter.description}</p>
              <p className="ve-starter-pages">{pageNamesOf(project).join(' · ')}</p>
              <div className="ve-starter-actions">
                <Button
                  aria-label={`Preview ${starter.name}`}
                  onClick={() => setPreviewing(loaded)}
                >
                  Preview
                </Button>
                <Button
                  variant="primary"
                  aria-label={`Use this starter: ${starter.name}`}
                  disabled={isDisabled}
                  onClick={() => onUse(starter, project)}
                >
                  Use this starter
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
      {previewing !== null && (
        <StarterPreview
          starter={previewing.starter}
          project={previewing.project}
          isDisabled={isDisabled}
          onUse={(shown) => onUse(previewing.starter, shown)}
          onClose={() => setPreviewing(null)}
        />
      )}
    </>
  );
}
