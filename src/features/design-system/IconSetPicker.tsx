import { useState, type JSX } from 'react';
import { noticeShown } from '../../app/editorSlice';
import { iconSetChanged } from '../../app/projectSlice';
import { dispatch, useStore } from '../../app/store';
import { iconSvg, resolveIcon } from '../../render/icons';
import { defaultIconSets } from '../icons/iconSets';
import { loadIconSet } from '../icons/loadIconSet';
import { Field, Select } from '../../../packages/ui/src';

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

  const options = [];
  for (const info of defaultIconSets()) options.push({ value: info.id, label: info.label });

  return (
    <>
      <Field id="ve-icon-set" label="Default icon set">
        <Select
          id="ve-icon-set"
          value={loadingSet ?? iconSet}
          disabled={loadingSet !== null}
          options={options}
          onChange={(event) => void choose(event.target.value)}
        />
      </Field>
      <div
        className="ve-icon-samples"
        aria-hidden="true"
        dangerouslySetInnerHTML={{ __html: sampleMarkup(iconSet) }}
      />
    </>
  );
}
