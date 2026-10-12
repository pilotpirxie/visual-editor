import { useMemo, useState, type JSX } from 'react';
import type { AssistantModel } from '../../app/appSettings';
import { Button, SearchInput } from '../../../packages/ui/src';

const PAGE_SIZE = 40;
const THOUSAND = 1000;
const PRICE_FORMAT = new Intl.NumberFormat('en', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
});

export function modelDetails(model: AssistantModel): string {
  const details: string[] = [];
  if (model.promptPrice !== null && model.completionPrice !== null) {
    const input = PRICE_FORMAT.format(model.promptPrice);
    const output = PRICE_FORMAT.format(model.completionPrice);
    details.push(`${input} in, ${output} out per million tokens`);
  }
  if (model.contextLength !== null) {
    details.push(`${Math.round(model.contextLength / THOUSAND)}k context`);
  }
  if (model.efforts.length === 0) details.push('no effort setting');
  return details.join(' · ');
}

export type PickerModel = { id: string; name: string; details: string };

function matchingModels(models: readonly PickerModel[], query: string): PickerModel[] {
  const wanted = query.trim().toLowerCase();
  if (wanted === '') return [...models];
  const matches: PickerModel[] = [];
  for (const model of models) {
    const haystack = `${model.name} ${model.id}`.toLowerCase();
    if (haystack.includes(wanted)) matches.push(model);
  }
  return matches;
}

type ModelPickerProps = {
  label: string;
  models: readonly PickerModel[];
  currentId: string | null;
  onPick(id: string): void;
};

export function ModelPicker({ label, models, currentId, onPick }: ModelPickerProps): JSX.Element {
  const [query, setQuery] = useState('');
  const [shownCount, setShownCount] = useState(PAGE_SIZE);
  const matches = useMemo(() => matchingModels(models, query), [models, query]);
  const shown = matches.slice(0, shownCount);

  return (
    <div className="ve-model-picker">
      <SearchInput
        label={`Search ${label.toLowerCase()}`}
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setShownCount(PAGE_SIZE);
        }}
      />
      <ul className="ve-model-list" aria-label={label}>
        {shown.map((model) => (
          <li key={model.id}>
            <button
              type="button"
              className="ve-model-option"
              aria-pressed={model.id === currentId}
              onClick={() => onPick(model.id)}
            >
              <span className="ve-model-name">{model.name}</span>
              <span className="ui-muted">{model.details}</span>
            </button>
          </li>
        ))}
      </ul>
      {matches.length === 0 && <p className="ui-muted">No models match “{query.trim()}”.</p>}
      {matches.length > shown.length && (
        <Button onClick={() => setShownCount(shownCount + PAGE_SIZE)}>Show more models</Button>
      )}
    </div>
  );
}
