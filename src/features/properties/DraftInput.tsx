import { useState, type JSX } from 'react';

type DraftInputProps = {
  id?: string;
  label: string;
  value: string;
  type?: 'text' | 'number';
  min?: number;
  max?: number;
  step?: number;
  validate(text: string): string | null;
  onCommit(text: string): void;
};

type Draft = { text: string; base: string; error: string };

export function DraftInput({
  id,
  label,
  value,
  type = 'text',
  min,
  max,
  step,
  validate,
  onCommit,
}: DraftInputProps): JSX.Element {
  const [draft, setDraft] = useState<Draft | null>(null);
  const isDraftStale = draft !== null && draft.base !== value;
  if (isDraftStale) setDraft(null);
  const activeDraft = isDraftStale ? null : draft;
  const errorId = `${id ?? label}-error`;

  function change(text: string): void {
    const error = validate(text);
    if (error === null) {
      setDraft(null);
      onCommit(text);
      return;
    }
    setDraft({ text, base: value, error });
  }

  return (
    <>
      <input
        id={id}
        className={type === 'number' ? 've-input ve-input--number' : 've-input'}
        type={type}
        min={min}
        max={max}
        step={step}
        spellCheck={false}
        aria-label={id === undefined ? label : undefined}
        aria-invalid={activeDraft !== null}
        aria-describedby={activeDraft === null ? undefined : errorId}
        value={activeDraft === null ? value : activeDraft.text}
        onChange={(event) => change(event.target.value)}
      />
      {activeDraft !== null && (
        <p id={errorId} className="ve-control-error" role="alert">
          {activeDraft.error}
        </p>
      )}
    </>
  );
}
