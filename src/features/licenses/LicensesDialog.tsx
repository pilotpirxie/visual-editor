import { useEffect, useState, type JSX } from 'react';
import { ICON_SET_INFO } from '../../../packages/icon-data/src/sets';
import './licenses.css';
import { closeDialogOf, Dialog } from '../../../packages/ui/src';

const TITLE_ID = 've-licenses-title';
const GOOGLE_FONTS_ATTRIBUTION = 'https://fonts.google.com/attribution';

const licenseTexts = import.meta.glob<string>('./texts/*.txt', {
  query: '?raw',
  import: 'default',
});

type LicenseText = { status: 'loading' } | { status: 'ready'; text: string } | { status: 'failed' };

function LicenseBody({ setId }: { setId: string }): JSX.Element {
  const [license, setLicense] = useState<LicenseText>({ status: 'loading' });

  useEffect(() => {
    const load = licenseTexts[`./texts/${setId}.txt`];
    if (load === undefined) return;
    let isCancelled = false;
    async function loadLicense(): Promise<void> {
      let text: string;
      try {
        text = await load();
      } catch (error) {
        console.error(`Could not load the license of ${setId}`, error);
        if (!isCancelled) setLicense({ status: 'failed' });
        return;
      }
      if (!isCancelled) setLicense({ status: 'ready', text });
    }
    void loadLicense();
    return () => {
      isCancelled = true;
    };
  }, [setId]);

  if (license.status === 'loading') return <p className="ui-muted">Loading the license…</p>;
  if (license.status === 'failed')
    return <p className="ui-field-error">The license text could not be loaded.</p>;
  return <pre className="ve-license-text">{license.text}</pre>;
}

export function LicensesDialog({ onClose }: { onClose(): void }): JSX.Element {
  return (
    <Dialog labelId={TITLE_ID} size="wide" onClose={onClose}>
      <div className="ui-dialog-body">
        <h2 id={TITLE_ID} className="ui-title">
          Open-source licenses
        </h2>
        <p>
          The icon sets below ship with the editor. Exported sites include only the icons they use,
          and a licenses.txt file that names their sets.
        </p>
        {ICON_SET_INFO.map((info) => (
          <details key={info.id} className="ve-license">
            <summary>
              {info.label} · {info.license}
            </summary>
            <p>
              <a href={info.licenseUrl} target="_blank" rel="noopener noreferrer">
                {info.licenseUrl}
              </a>
            </p>
            <LicenseBody setId={info.id} />
          </details>
        ))}
        <p>
          Fonts come from Google Fonts under their own open licenses:{' '}
          <a href={GOOGLE_FONTS_ATTRIBUTION} target="_blank" rel="noopener noreferrer">
            {GOOGLE_FONTS_ATTRIBUTION}
          </a>
        </p>
        <div className="ui-dialog-actions">
          <button
            type="button"
            className="ui-button ui-button--primary"
            onClick={(event) => closeDialogOf(event.currentTarget)}
          >
            Close
          </button>
        </div>
      </div>
    </Dialog>
  );
}
