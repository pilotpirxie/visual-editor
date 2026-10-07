import { useState, type JSX } from 'react';
import { noticeShown } from '../../app/editorSlice';
import { iconSetChanged } from '../../app/projectSlice';
import { dispatch, useStore } from '../../app/store';
import { iconSvg, resolveIcon } from '../../render/icons';
import { defaultIconSets } from '../icons/iconSets';
import { loadIconSet } from '../icons/loadIconSet';

const SAMPLE_ICONS = ['zap', 'shield', 'smile', 'star', 'check', 'mail', 'arrow-right', 'menu'];

function sampleMarkup(iconSet: string): string {
  let markup = '';
  for (const name of SAMPLE_ICONS) {
    const icon = resolveIcon(name, iconSet);
    if (icon !== null) markup += iconSvg(icon);
  }
  return markup;
}

export function IconSetPicker(): JSX.Element {
  const iconSet = useStore((state) => state.project.designSystem.iconSet);
  const [loadingSet, setLoadingSet] = useState<string | null>(null);

  async function choose(nextSet: string): Promise<void> {
    setLoadingSet(nextSet);
    try {
      await loadIconSet(nextSet);
      dispatch(iconSetChanged(nextSet));
    } catch (error) {
      console.error(`Could not switch to the ${nextSet} icon set`, error);
      dispatch(noticeShown('error', 'That icon set could not be loaded. Try again.'));
    } finally {
      setLoadingSet(null);
    }
  }

  return (
    <div className="ve-control">
      <label className="ve-control-label" htmlFor="ve-icon-set">
        Default icon set
      </label>
      <select
        id="ve-icon-set"
        className="ve-input"
        value={loadingSet ?? iconSet}
        disabled={loadingSet !== null}
        aria-describedby="ve-icon-set-help"
        onChange={(event) => void choose(event.target.value)}
      >
        {defaultIconSets().map((info) => (
          <option key={info.id} value={info.id}>
            {info.label}
          </option>
        ))}
      </select>
      <div
        className="ve-icon-samples"
        aria-hidden="true"
        dangerouslySetInnerHTML={{ __html: sampleMarkup(iconSet) }}
      />
      <p id="ve-icon-set-help" className="ve-control-help">
        Icons that blocks start with follow this set. Icons you picked by hand stay as they are.
      </p>
    </div>
  );
}
