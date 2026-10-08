import { useState, type JSX } from 'react';
import { FieldError, fieldErrorId } from './Field';
import { NumberInput } from './NumberInput';
import { TextArea } from './TextArea';
import { TextInput } from './TextInput';

type DraftInputProps = {
  id: string;
  label?: string;
  value: string;
  type?: 'text' | 'number';
  unit?: string;
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
  rows?: number;
  validate(text: string): string | null;
  onCommit(text: string): void;
};

type Draft = { text: string; base: string; error: string; isErrorShown: boolean };

export function DraftInput({
  id,
  label,
  value,
  type = 'text',
  unit,
  min,
  max,
  step,
  placeholder,
  rows,
  validate,
  onCommit,
}: DraftInputProps): JSX.Element {
  const [draft, setDraft] = useState<Draft | null>(null);
  const isDraftStale = draft !== null && draft.base !== value;
  if (isDraftStale) setDraft(null);
  const activeDraft = isDraftStale ? null : draft;
  const error = activeDraft?.isErrorShown === true ? activeDraft.error : null;

  function change(text: string): void {
    const nextError = validate(text);
    if (nextError === null) {
      setDraft(null);
      onCommit(text);
      return;
    }
    const isErrorShown = activeDraft?.isErrorShown ?? false;
    setDraft({ text, base: value, error: nextError, isErrorShown });
  }

  function showErrorOnLeave(): void {
    if (activeDraft === null || activeDraft.isErrorShown) return;
    setDraft({ ...activeDraft, isErrorShown: true });
  }

  const inputProps = {
    id,
    placeholder,
    spellCheck: false,
    'aria-label': label,
    'aria-describedby': error === null ? undefined : fieldErrorId(id),
    isInvalid: error !== null,
    value: activeDraft === null ? value : activeDraft.text,
    onChange: (event: { target: { value: string } }) => change(event.target.value),
    onBlur: showErrorOnLeave,
  };

  return (
    <>
      {type === 'number' && (
        <NumberInput {...inputProps} unit={unit} min={min} max={max} step={step} />
      )}
      {type === 'text' && rows === undefined && <TextInput {...inputProps} />}
      {type === 'text' && rows !== undefined && <TextArea {...inputProps} rows={rows} />}
      <FieldError id={id} error={error} />
    </>
  );
}
