import type { ComponentPropsWithRef, JSX } from 'react';
import { classNames } from './classNames';
import { Icon } from './Icon';
import './SearchInput.css';

type SearchInputProps = Omit<ComponentPropsWithRef<'input'>, 'type'> & { label: string };

export function SearchInput({
  label,
  className,
  placeholder,
  ...props
}: SearchInputProps): JSX.Element {
  return (
    <label className={classNames('ui-search', className)}>
      <Icon name="search" />
      <input type="search" aria-label={label} placeholder={placeholder ?? label} {...props} />
    </label>
  );
}
