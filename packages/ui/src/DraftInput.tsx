import { useState, type JSX } from 'react';
import { FieldError, fieldErrorId } from './Field';
import { NumberInput } from './NumberInput';
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
  validate(text: string): string | null;
  onCommit(text: string): void;
};

type Draft = { text: string; base: string; error: string };

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
  validate,
  onCommit,
}: DraftInputProps): JSX.Element {
  const [draft, setDraft] = useState<Draft | null>(null);
  const isDraftStale = draft !== null && draft.base !== value;
  if (isDraftStale) setDraft(null);
  const activeDraft = isDraftStale ? null : draft;
  const error = activeDraft === null ? null : activeDraft.error;

  function change(text: string): void {
    const nextError = validate(text);
    if (nextError === null) {
      setDraft(null);
      onCommit(text);
      return;
    }
    setDraft({ text, base: value, error: nextError });
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
  };

  return (
    <>
      {type === 'number' ? (
        <NumberInput {...inputProps} unit={unit} min={min} max={max} step={step} />
      ) : (
        <TextInput {...inputProps} />
      )}
      <FieldError id={id} error={error} />
    </>
  );
}
