import type { JSX, ReactNode } from 'react';
import type { EditKind } from '../../app/projectSlice';
import { SITE_META_RULES } from '../../app/settingsRules';
import { useStore } from '../../app/store';
import type { MetaTag } from '../../app/types';
import type { Field as FieldSchema } from '../../components/types';
import { resolveColor } from '../design-system/colors';
import { useSection } from '../editor/useSection';
import { FieldControl } from '../properties/FieldControl';
import { Button, DraftInput, Field, Section, Select } from '../../../packages/ui/src';

export type ChoiceOption = { value: string; label: string };

export const DEFAULT_THEME_COLOR = 'var(--color-primary)';

export const IMAGE_PREVIEW_OPTIONS: ChoiceOption[] = [
  { value: 'large', label: 'Large' },
  { value: 'standard', label: 'Standard' },
  { value: 'none', label: 'None' },
];

export const OPEN_GRAPH_OPTIONS: ChoiceOption[] = [
  { value: 'website', label: 'Website' },
  { value: 'article', label: 'Article' },
  { value: 'profile', label: 'Profile' },
];

export const FREQUENCY_OPTIONS: ChoiceOption[] = [
  { value: 'always', label: 'Always' },
  { value: 'hourly', label: 'Hourly' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
  { value: 'never', label: 'Never' },
];

const PRIORITY_STEPS = 10;

export const PRIORITY_OPTIONS: ChoiceOption[] = Array.from(
  { length: PRIORITY_STEPS + 1 },
  (_, index) => {
    const priority = ((PRIORITY_STEPS - index) / PRIORITY_STEPS).toFixed(1);
    if (index === 0) return { value: priority, label: `${priority}, highest` };
    if (index === PRIORITY_STEPS) return { value: priority, label: `${priority}, lowest` };
    return { value: priority, label: priority };
  },
);

export function priorityText(priority: number | undefined): string | undefined {
  return priority === undefined ? undefined : priority.toFixed(1);
}

export function priorityValue(text: string): number | undefined {
  return text === '' ? undefined : Number(text);
}

export function pickOption<Option extends string>(
  options: readonly Option[],
  value: string,
): Option | undefined {
  for (const option of options) {
    if (option === value) return option;
  }
  return undefined;
}

export function labelOf(options: readonly ChoiceOption[], value: string | undefined): string {
  for (const option of options) {
    if (option.value === value) return option.label;
  }
  return '';
}

type MetaSectionProps = {
  id: string;
  title: string;
  isInitiallyOpen?: boolean;
  children: ReactNode;
};

export function MetaSection({
  id,
  title,
  isInitiallyOpen = false,
  children,
}: MetaSectionProps): JSX.Element {
  const section = useSection(id, isInitiallyOpen);
  return (
    <Section title={title} isOpen={section.isOpen} onToggle={section.onToggle}>
      {children}
    </Section>
  );
}

type MetaTextInputProps = {
  id: string;
  label: string;
  value: string | undefined;
  placeholder?: string;
  rows?: number;
  validate(text: string): string | null;
  onCommit(text: string): void;
};

export function MetaTextInput({
  id,
  label,
  value,
  placeholder,
  rows,
  validate,
  onCommit,
}: MetaTextInputProps): JSX.Element {
  return (
    <div data-field-path={id}>
      <Field id={id} label={label}>
        <DraftInput
          id={id}
          value={value ?? ''}
          placeholder={placeholder}
          rows={rows}
          validate={validate}
          onCommit={onCommit}
        />
      </Field>
    </div>
  );
}

type MetaSelectProps = {
  id: string;
  label: string;
  value: string | undefined;
  options: readonly ChoiceOption[];
  emptyLabel: string;
  onChange(value: string): void;
};

export function MetaSelect({
  id,
  label,
  value,
  options,
  emptyLabel,
  onChange,
}: MetaSelectProps): JSX.Element {
  return (
    <Field id={id} label={label}>
      <Select
        id={id}
        value={value ?? ''}
        options={[{ value: '', label: emptyLabel }, ...options]}
        onChange={(event) => onChange(event.target.value)}
      />
    </Field>
  );
}

export const YES_NO_OPTIONS: ChoiceOption[] = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
];

export function yesNoValue(value: boolean | undefined): string | undefined {
  if (value === undefined) return undefined;
  return value ? 'yes' : 'no';
}

export function booleanOf(value: string): boolean | undefined {
  if (value === 'yes') return true;
  if (value === 'no') return false;
  return undefined;
}

type ThemeColorInputProps = {
  id: string;
  label: string;
  value: string | undefined;
  inheritedValue: string | undefined;
  emptyLabel: string;
  resetLabel: string;
  onChange(value: string | undefined, kind: EditKind): void;
};

export function ThemeColorInput({
  id,
  label,
  value,
  inheritedValue,
  emptyLabel,
  resetLabel,
  onChange,
}: ThemeColorInputProps): JSX.Element {
  const tokens = useStore((state) => state.project.designSystem.tokens);
  if (value === undefined) {
    const shown = inheritedValue === undefined ? null : resolveColor(inheritedValue, tokens);
    return (
      <div className="ve-meta-color" data-field-path={id}>
        <span className="ui-field-label" id={`${id}-label`}>
          {label}
        </span>
        <div className="ve-meta-color-unset">
          {shown !== null && (
            <span className="ve-swatch-color" style={{ background: shown }} aria-hidden="true" />
          )}
          <span className="ve-meta-color-note">{emptyLabel}</span>
          <Button
            aria-describedby={`${id}-label`}
            onClick={() => onChange(inheritedValue ?? DEFAULT_THEME_COLOR, 'discrete')}
          >
            Choose color
          </Button>
        </div>
      </div>
    );
  }
  const field: FieldSchema = { name: id, label, type: 'color', default: '' };
  return (
    <div className="ve-meta-color">
      <FieldControl
        field={field}
        value={value}
        path={id}
        onChange={(next, kind) => {
          if (typeof next === 'string') onChange(next, kind);
        }}
      />
      <Button variant="ghost" icon="rotate-ccw" onClick={() => onChange(undefined, 'discrete')}>
        {resetLabel}
      </Button>
    </div>
  );
}

const META_TAG_FIELD: FieldSchema = {
  name: 'metaTags',
  label: 'Meta tags',
  type: 'list',
  default: [],
  maxItems: 30,
  itemLabel: 'key',
  itemFields: [
    {
      name: 'attribute',
      label: 'Attribute',
      type: 'select',
      default: 'name',
      options: [
        { value: 'name', label: 'name' },
        { value: 'property', label: 'property' },
      ],
    },
    { name: 'key', label: 'Name', type: 'text', default: '', placeholder: 'format-detection' },
    { name: 'content', label: 'Content', type: 'text', default: '', placeholder: 'telephone=no' },
  ],
};

type MetaTagsInputProps = {
  id: string;
  label: string;
  value: MetaTag[] | undefined;
  onChange(tags: MetaTag[], kind: EditKind): void;
};

export function MetaTagsInput({ id, label, value, onChange }: MetaTagsInputProps): JSX.Element {
  return (
    <FieldControl
      field={{ ...META_TAG_FIELD, label }}
      value={value ?? []}
      path={id}
      onChange={(next, kind) => {
        const parsed = SITE_META_RULES.metaTags(next);
        if ('value' in parsed) onChange(parsed.value, kind);
      }}
    />
  );
}
