import { useRef, type ComponentPropsWithoutRef, type JSX } from 'react';
import { classNames } from './classNames';
import { Icon } from './Icon';
import './SearchInput.css';

type SearchInputProps = Omit<ComponentPropsWithoutRef<'input'>, 'type' | 'value' | 'onChange'> & {
  label: string;
  value: string;
  onQuery(query: string): void;
};

export function SearchInput({
  label,
  className,
  placeholder,
  value,
  onQuery,
  ...props
}: SearchInputProps): JSX.Element {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <label className={classNames('ui-search', className)}>
      <Icon name="search" />
      <input
        ref={inputRef}
        type="search"
        aria-label={label}
        placeholder={placeholder ?? label}
        value={value}
        onChange={(event) => onQuery(event.currentTarget.value)}
        {...props}
      />
      {value !== '' && (
        <button
          type="button"
          className="ui-search-clear"
          aria-label="Clear search"
          tabIndex={-1}
          onClick={() => {
            onQuery('');
            inputRef.current?.focus();
          }}
        >
          <Icon name="x" />
        </button>
      )}
    </label>
  );
}
