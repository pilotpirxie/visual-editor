import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { undo } from '../../app/history';
import { createSampleProject } from '../../app/projectFactory';
import { dispatch, store } from '../../app/store';
import type { Project } from '../../app/types';
import type { Field } from '../../components/types';
import { componentBlockOf, homePage, loadIntoAppStore } from '../../test/fixtures';
import {
  elementText,
  fieldTextValue,
  hasOnlyText,
  inlineTextField,
  isInsideInlineEdit,
  startInlineEdit,
  writeElementText,
} from './inlineEdit';

const TEXT_FIELD: Field = { name: 'title', label: 'Title', type: 'text', default: '' };
const TEXTAREA_FIELD: Field = { name: 'text', label: 'Text', type: 'textarea', default: '' };

function heroId(project: Project): string {
  return homePage(project).blockIds[1];
}

function storedValue(blockId: string, name: string): unknown {
  return componentBlockOf(store.getState().project, blockId).values[name];
}

function typeInto(element: HTMLElement, text: string): void {
  writeElementText(element, text);
  element.dispatchEvent(new Event('input', { bubbles: true }));
}

describe('inlineTextField', () => {
  it('allows top-level text and textarea fields only', () => {
    const project = createSampleProject();
    const blockId = heroId(project);
    expect(inlineTextField(project, blockId, 'title')?.type).toBe('text');
    expect(inlineTextField(project, blockId, 'text')?.type).toBe('textarea');
    expect(inlineTextField(project, blockId, 'primaryButton')).toBeNull();
    expect(inlineTextField(project, blockId, 'items.0')).toBeNull();
    expect(inlineTextField(project, 'missing', 'title')).toBeNull();
  });
});

describe('hasOnlyText', () => {
  it('accepts text and line breaks but not nested elements', () => {
    const element = document.createElement('p');
    element.innerHTML = 'One<br>Two';
    expect(hasOnlyText(element)).toBe(true);
    element.innerHTML = 'One <strong>two</strong>';
    expect(hasOnlyText(element)).toBe(false);
  });
});

describe('elementText and writeElementText', () => {
  it('turns line breaks into new lines and no-break spaces into spaces', () => {
    const element = document.createElement('p');
    element.innerHTML = 'One&nbsp;two<br>Three';
    expect(elementText(element)).toBe('One two\nThree');
  });

  it('writes text the same way the nl2br helper renders it', () => {
    const element = document.createElement('p');
    writeElementText(element, 'One <two>\nThree');
    expect(element.innerHTML).toBe('One &lt;two&gt;<br>Three');
  });
});

describe('fieldTextValue', () => {
  it('keeps a single-line field on one line', () => {
    expect(fieldTextValue(TEXT_FIELD, 'One\nTwo\n')).toBe('One Two');
  });

  it('keeps inner line breaks of a multi-line field and drops trailing ones', () => {
    expect(fieldTextValue(TEXTAREA_FIELD, 'One\nTwo\n\n')).toBe('One\nTwo');
  });

  it('cuts text at the maximum length', () => {
    expect(fieldTextValue({ ...TEXT_FIELD, maxLength: 3 }, 'Longer')).toBe('Lon');
  });
});

describe('startInlineEdit', () => {
  let blockId = '';
  let heading: HTMLElement;

  beforeEach(() => {
    const project = loadIntoAppStore(createSampleProject());
    blockId = heroId(project);
    heading = document.createElement('h1');
    writeElementText(heading, String(storedValue(blockId, 'title')));
    document.body.append(heading);
    startInlineEdit(heading, { blockId, field: TEXT_FIELD }, { x: 0, y: 0 });
  });

  afterEach(() => {
    heading.remove();
  });

  it('makes the element editable as plain text', () => {
    expect(heading.getAttribute('contenteditable')).toBe('plaintext-only');
    expect(isInsideInlineEdit(heading)).toBe(true);
  });

  it('saves typing to the field as one undo step', () => {
    const before = storedValue(blockId, 'title');
    typeInto(heading, 'New');
    typeInto(heading, 'New headline');
    expect(storedValue(blockId, 'title')).toBe('New headline');
    dispatch(undo());
    expect(storedValue(blockId, 'title')).toBe(before);
    expect(heading.textContent).toBe(before);
  });

  it('ends editing on Enter in a single-line field', () => {
    typeInto(heading, 'Done');
    heading.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    heading.dispatchEvent(new FocusEvent('blur'));
    expect(heading.hasAttribute('contenteditable')).toBe(false);
    expect(isInsideInlineEdit(heading)).toBe(false);
    expect(heading.textContent).toBe('Done');
  });
});
