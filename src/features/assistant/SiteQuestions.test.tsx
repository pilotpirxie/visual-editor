import { describe, expect, it, vi } from 'vitest';
import { changeValue, click, getButton, pressKey, queryButton, render } from '../../test/dom';
import { SiteQuestions } from './SiteQuestions';
import type { Answered, Question } from './siteSteps';

const KIND: Question = {
  question: 'What kind of site is it?',
  suggestions: ['Shop', 'Portfolio', 'Blog'],
  allowsMany: false,
  recommended: ['Portfolio'],
};

const PAGES: Question = {
  question: 'Which pages do you need?',
  suggestions: ['About', 'Contact', 'Pricing'],
  allowsMany: true,
  recommended: ['About'],
};

const NAME: Question = {
  question: 'What is the site called?',
  suggestions: [],
  allowsMany: false,
  recommended: [],
};

type Asked = {
  container: HTMLDivElement;
  onDone: ReturnType<typeof vi.fn<(answers: Answered[]) => void>>;
  onBuildNow: ReturnType<typeof vi.fn<(answers: Answered[]) => void>>;
};

function ask(questions: Question[]): Asked {
  const onDone = vi.fn<(answers: Answered[]) => void>();
  const onBuildNow = vi.fn<(answers: Answered[]) => void>();
  const { container } = render(
    <SiteQuestions questions={questions} onDone={onDone} onBuildNow={onBuildNow} />,
  );
  return { container, onDone, onBuildNow };
}

function questionText(container: HTMLElement): string | null {
  return container.querySelector('.ve-questions-question')?.textContent ?? null;
}

function countText(container: HTMLElement): string | null {
  return container.querySelector('.ve-questions-count')?.textContent ?? null;
}

function choice(container: HTMLElement, text: string): HTMLButtonElement {
  for (const button of container.querySelectorAll<HTMLButtonElement>('.ve-questions-choice')) {
    if (button.querySelector('.ve-questions-choice-text')?.textContent === text) return button;
  }
  throw new Error(`No choice ${text}`);
}

function ownAnswer(container: HTMLElement): HTMLInputElement {
  const input = container.querySelector<HTMLInputElement>('input[aria-label="Your own answer"]');
  if (input === null) throw new Error('The own answer field is missing');
  return input;
}

describe('SiteQuestions, one question at a time', () => {
  it('starts on the first question with the suggested answer picked', () => {
    const { container } = ask([KIND, PAGES]);
    expect(countText(container)).toBe('Question 1 of 2');
    expect(questionText(container)).toBe('What kind of site is it?');
    expect(document.activeElement).toBe(container.querySelector('.ve-questions-question'));
    const progress = container.querySelector('progress');
    expect(progress?.getAttribute('max')).toBe('2');
    expect(progress?.getAttribute('value')).toBe('1');
    expect(choice(container, 'Portfolio').getAttribute('aria-pressed')).toBe('true');
    expect(choice(container, 'Portfolio').getAttribute('aria-label')).toBe('Portfolio (suggested)');
    expect(choice(container, 'Shop').getAttribute('aria-pressed')).toBe('false');
    expect(choice(container, 'Shop').getAttribute('aria-keyshortcuts')).toBe('A');
    expect(queryButton(container, 'Back')).toBeNull();
  });

  it('shows nothing when there is nothing to ask', () => {
    expect(ask([]).container.innerHTML).toBe('');
  });

  it('moves on as soon as one answer of a single-choice question is picked', () => {
    const { container, onDone } = ask([KIND, NAME]);
    click(choice(container, 'Shop'));
    expect(countText(container)).toBe('Question 2 of 2');
    expect(questionText(container)).toBe('What is the site called?');
    expect(container.querySelector('.ve-questions-choices')).toBeNull();
    expect(onDone).not.toHaveBeenCalled();
  });

  it('hands over every answer after the last question', () => {
    const { container, onDone } = ask([KIND, NAME]);
    click(choice(container, 'Shop'));
    changeValue(ownAnswer(container), '  Crumb & Co ');
    click(getButton(container, 'OK'));
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(onDone).toHaveBeenCalledWith([
      { question: 'What kind of site is it?', answer: 'Shop' },
      { question: 'What is the site called?', answer: 'Crumb & Co' },
    ]);
  });

  it('accepts the suggested answer with OK', () => {
    const { container, onDone } = ask([KIND]);
    click(getButton(container, 'OK'));
    expect(onDone).toHaveBeenCalledWith([
      { question: 'What kind of site is it?', answer: 'Portfolio' },
    ]);
  });

  it('cannot confirm a question without any answer', () => {
    const { container, onDone } = ask([NAME]);
    expect(getButton(container, 'OK').disabled).toBe(true);
    pressKey(document.body, 'Enter');
    expect(onDone).not.toHaveBeenCalled();
    changeValue(ownAnswer(container), '   ');
    expect(getButton(container, 'OK').disabled).toBe(true);
  });

  it('replaces the picked answer of a single-choice question with a typed one', () => {
    const { container, onDone } = ask([KIND]);
    changeValue(ownAnswer(container), 'A recipe site');
    expect(choice(container, 'Portfolio').getAttribute('aria-pressed')).toBe('false');
    click(getButton(container, 'OK'));
    expect(onDone).toHaveBeenCalledWith([
      { question: 'What kind of site is it?', answer: 'A recipe site' },
    ]);
  });
});

describe('SiteQuestions with several answers', () => {
  it('toggles answers and stays on the question until it is confirmed', () => {
    const { container, onDone } = ask([PAGES]);
    expect(container.textContent).toContain('Choose as many as you like.');
    click(choice(container, 'Pricing'));
    click(choice(container, 'About'));
    expect(countText(container)).toBe('Question 1 of 1');
    expect(choice(container, 'About').getAttribute('aria-pressed')).toBe('false');
    expect(choice(container, 'Pricing').getAttribute('aria-pressed')).toBe('true');
    click(choice(container, 'Contact'));
    click(getButton(container, 'OK'));
    expect(onDone).toHaveBeenCalledWith([
      { question: 'Which pages do you need?', answer: 'Pricing, Contact' },
    ]);
  });

  it('adds a typed answer to the picked ones', () => {
    const { container, onDone } = ask([PAGES]);
    changeValue(ownAnswer(container), 'Careers');
    expect(choice(container, 'About').getAttribute('aria-pressed')).toBe('true');
    click(getButton(container, 'OK'));
    expect(onDone).toHaveBeenCalledWith([
      { question: 'Which pages do you need?', answer: 'About, Careers' },
    ]);
  });
});

describe('SiteQuestions from the keyboard', () => {
  it('picks an answer with its letter, in either case', () => {
    const { container } = ask([KIND, PAGES]);
    pressKey(document.body, 'c');
    expect(questionText(container)).toBe('Which pages do you need?');
    pressKey(document.body, 'B');
    expect(choice(container, 'Contact').getAttribute('aria-pressed')).toBe('true');
  });

  it('leaves letters alone while typing, with a modifier key, and without a matching answer', () => {
    const { container } = ask([KIND, PAGES]);
    pressKey(ownAnswer(container), 'a');
    pressKey(document.body, 'a', { ctrlKey: true });
    pressKey(document.body, 'a', { metaKey: true });
    pressKey(document.body, 'a', { altKey: true });
    pressKey(document.body, 'h');
    pressKey(document.body, 'ArrowDown');
    expect(countText(container)).toBe('Question 1 of 2');
  });

  it('confirms with Enter, also from a toggled answer, but not from another button', () => {
    const { container, onDone } = ask([PAGES, NAME]);
    pressKey(getButton(container, 'Skip'), 'Enter');
    expect(countText(container)).toBe('Question 1 of 2');
    const used = pressKey(choice(container, 'About'), 'Enter');
    expect(used.defaultPrevented).toBe(true);
    expect(countText(container)).toBe('Question 2 of 2');
    expect(onDone).not.toHaveBeenCalled();
  });

  it('stops listening to keys once it is gone', () => {
    const onDone = vi.fn<(answers: Answered[]) => void>();
    const rendered = render(
      <SiteQuestions questions={[KIND]} onDone={onDone} onBuildNow={() => {}} />,
    );
    rendered.unmount();
    pressKey(document.body, 'a');
    pressKey(document.body, 'Enter');
    expect(onDone).not.toHaveBeenCalled();
  });
});

describe('SiteQuestions shortcuts around the questions', () => {
  it('goes back to an earlier question and keeps its answer', () => {
    const { container } = ask([KIND, PAGES]);
    click(choice(container, 'Blog'));
    click(getButton(container, 'Back'));
    expect(questionText(container)).toBe('What kind of site is it?');
    expect(choice(container, 'Blog').getAttribute('aria-pressed')).toBe('true');
    expect(choice(container, 'Portfolio').getAttribute('aria-pressed')).toBe('false');
  });

  it('skips a question with an empty answer', () => {
    const { container, onDone } = ask([KIND, NAME]);
    click(getButton(container, 'Skip'));
    click(getButton(container, 'Skip'));
    expect(onDone).toHaveBeenCalledWith([
      { question: 'What kind of site is it?', answer: '' },
      { question: 'What is the site called?', answer: '' },
    ]);
  });

  it('builds at once with the answers given so far, without the skipped ones', () => {
    const { container, onBuildNow, onDone } = ask([KIND, PAGES, NAME]);
    click(choice(container, 'Shop'));
    click(getButton(container, 'Skip'));
    click(getButton(container, 'Just build it'));
    expect(onBuildNow).toHaveBeenCalledWith([
      { question: 'What kind of site is it?', answer: 'Shop' },
    ]);
    expect(onDone).not.toHaveBeenCalled();
  });

  it('builds at once with no answers from the first question', () => {
    const { container, onBuildNow } = ask([KIND, PAGES]);
    click(getButton(container, 'Just build it'));
    expect(onBuildNow).toHaveBeenCalledWith([]);
  });
});
