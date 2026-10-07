import { beforeEach, describe, expect, it, vi } from 'vitest';
import { blockAdvancedSet, pageAdded } from '../../app/projectSlice';
import { dispatch, store } from '../../app/store';
import type { ButtonValue, Field, LinkValue } from '../../components/types';
import { changeValue, click, render, runInAct } from '../../test/dom';
import { homePage, loadIntoAppStore } from '../../test/fixtures';
import { FieldControl } from './FieldControl';

vi.mock('../../persistence/db', () => ({
  putProject: vi.fn(async () => {}),
  getProject: vi.fn(async () => null),
  listProjects: vi.fn(async () => []),
  deleteProject: vi.fn(async () => {}),
}));

const LINK_FIELD: Field = { name: 'link', label: 'Link', type: 'link', default: null };
const BUTTON_FIELD: Field = { name: 'cta', label: 'Button', type: 'button', default: null };

function renderLink(value: LinkValue) {
  const onChange = vi.fn();
  const rendered = render(
    <FieldControl field={LINK_FIELD} value={value} path="link" onChange={onChange} />,
  );
  return { ...rendered, onChange };
}

function select(container: HTMLElement, id: string): HTMLSelectElement {
  const element = container.querySelector(`#${CSS.escape(id)}`);
  if (!(element instanceof HTMLSelectElement)) throw new Error(`No select #${id}`);
  return element;
}

function optionLabels(element: HTMLSelectElement): string[] {
  return [...element.options].map((option) => option.textContent ?? '');
}

beforeEach(() => {
  loadIntoAppStore();
  runInAct(() => dispatch(pageAdded({ id: 'about', name: 'About', slug: 'about' })));
});

describe('LinkField', () => {
  it('points the link at a page of the project by its id', () => {
    const { container, onChange } = renderLink({ type: 'url', url: '', newTab: false });
    changeValue(select(container, 've-field-link-type'), 'page');
    const homeId = store.getState().project.pages.homePageId;
    expect(onChange).toHaveBeenLastCalledWith(
      { type: 'page', pageId: homeId, newTab: false },
      'discrete',
    );
  });

  it('lists every page for a page link', () => {
    const { container, onChange } = renderLink({ type: 'page', pageId: 'about', newTab: false });
    expect(optionLabels(select(container, 've-field-link-page'))).toEqual(['Home', 'About']);
    changeValue(select(container, 've-field-link-page'), store.getState().project.pages.homePageId);
    expect(onChange).toHaveBeenCalledOnce();
  });

  it('offers the anchors of the chosen page for a section link', () => {
    const heroId = homePage(store.getState().project).blockIds[1];
    runInAct(() => dispatch(blockAdvancedSet(heroId, { key: 'anchor', value: 'top' }, 'discrete')));
    const { container, onChange } = renderLink({ type: 'section', anchor: '', newTab: false });
    expect(optionLabels(select(container, 've-field-link-page'))).toEqual([
      'This page',
      'Home',
      'About',
    ]);
    expect(optionLabels(select(container, 've-field-link-section'))).toEqual([
      'Top of the page',
      '#top',
    ]);
    changeValue(select(container, 've-field-link-section'), 'top');
    expect(onChange).toHaveBeenLastCalledWith(
      { type: 'section', anchor: 'top', newTab: false },
      'discrete',
    );
  });

  it('says so when the page has no anchors to link to', () => {
    const { container } = renderLink({
      type: 'section',
      pageId: 'about',
      anchor: '',
      newTab: false,
    });
    expect(container.textContent).toContain('No block on this page has an anchor id.');
  });

  it('types a web address and opens it in a new tab', () => {
    const { container, onChange } = renderLink({ type: 'url', url: '', newTab: false });
    changeValue(container.querySelector('#ve-field-link-address'), 'https://example.com');
    expect(onChange).toHaveBeenLastCalledWith(
      { type: 'url', url: 'https://example.com', newTab: false },
      'continuous',
    );
    click(container.querySelector('input[type="checkbox"]'));
    expect(onChange).toHaveBeenLastCalledWith({ type: 'url', url: '', newTab: true }, 'discrete');
  });

  it('keeps an invalid email address as a draft with a message', () => {
    const { container, onChange } = renderLink({ type: 'email', url: '', newTab: false });
    changeValue(container.querySelector('#ve-field-link-address'), 'hello');
    expect(onChange).not.toHaveBeenCalled();
    expect(container.querySelector('[role="alert"]')?.textContent).toBe(
      'Enter an email address like hello@example.com',
    );
    expect(container.querySelector('input[type="checkbox"]')).toBeNull();
  });
});

describe('ButtonField', () => {
  const button: ButtonValue = {
    label: 'Start',
    link: { type: 'url', url: '#', newTab: false },
    variant: 'primary',
  };

  it('edits the label, the link and the style', () => {
    const onChange = vi.fn();
    const { container } = render(
      <FieldControl field={BUTTON_FIELD} value={button} path="cta" onChange={onChange} />,
    );
    changeValue(container.querySelector('#ve-field-cta-label'), 'Start now');
    expect(onChange).toHaveBeenLastCalledWith({ ...button, label: 'Start now' }, 'continuous');
    changeValue(select(container, 've-field-cta-variant'), 'ghost');
    expect(onChange).toHaveBeenLastCalledWith({ ...button, variant: 'ghost' }, 'discrete');
    changeValue(select(container, 've-field-cta-link-type'), 'page');
    expect(onChange.mock.lastCall?.[0].link.type).toBe('page');
  });

  it('asks for a label instead of saving an empty one', () => {
    const onChange = vi.fn();
    const { container } = render(
      <FieldControl field={BUTTON_FIELD} value={button} path="cta" onChange={onChange} />,
    );
    changeValue(container.querySelector('#ve-field-cta-label'), '');
    expect(onChange).not.toHaveBeenCalled();
    expect(container.querySelector('[role="alert"]')?.textContent).toBe('Enter the button label');
  });
});
