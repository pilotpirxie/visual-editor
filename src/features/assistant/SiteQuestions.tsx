import { useEffect, useEffectEvent, useRef, useState, type FormEvent, type JSX } from 'react';
import type { Answered, Question } from './siteSteps';
import { Button, Icon, TextInput } from '../../../packages/ui/src';

type Reply = { picked: string[]; typed: string };

const COUNT_ID = 've-site-questions-count';
const QUESTION_ID = 've-site-questions-current';
const CHOICE_KEYS = 'ABCDEFGH';
const EMPTY_REPLY: Reply = { picked: [], typed: '' };

function answerOf(reply: Reply): string {
  const parts = [...reply.picked];
  const typed = reply.typed.trim();
  if (typed !== '') parts.push(typed);
  return parts.join(', ');
}

type SiteQuestionsProps = {
  questions: readonly Question[];
  onDone(answers: Answered[]): void;
  onBuildNow(answers: Answered[]): void;
};

export function SiteQuestions({
  questions,
  onDone,
  onBuildNow,
}: SiteQuestionsProps): JSX.Element | null {
  const [position, setPosition] = useState(0);
  const [replies, setReplies] = useState<Reply[]>(() =>
    questions.map(({ recommended }) => ({ picked: [...recommended], typed: '' })),
  );
  const questionRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    questionRef.current?.focus();
  }, [position]);

  const current = questions[position];
  const reply = replies[position] ?? EMPTY_REPLY;

  function withReply(next: Reply): Reply[] {
    return replies.map((existing, index) => (index === position ? next : existing));
  }

  function answersUntil(given: readonly Reply[], end: number): Answered[] {
    const answers: Answered[] = [];
    for (const [index, asked] of questions.entries()) {
      if (index === end) break;
      answers.push({ question: asked.question, answer: answerOf(given[index] ?? EMPTY_REPLY) });
    }
    return answers;
  }

  function advance(given: Reply[]): void {
    setReplies(given);
    if (position < questions.length - 1) {
      setPosition(position + 1);
    } else {
      onDone(answersUntil(given, questions.length));
    }
  }

  function confirm(): void {
    if (answerOf(reply) !== '') advance(replies);
  }

  function pick(suggestion: string): void {
    if (current?.allowsMany !== true) {
      advance(withReply({ picked: [suggestion], typed: '' }));
      return;
    }
    const isPicked = reply.picked.includes(suggestion);
    const picked = isPicked
      ? reply.picked.filter((existing) => existing !== suggestion)
      : [...reply.picked, suggestion];
    setReplies(withReply({ ...reply, picked }));
  }

  const onKeyDown = useEffectEvent((event: KeyboardEvent): void => {
    const target = event.target;
    if (current === undefined || !(target instanceof HTMLElement)) return;
    if (target instanceof HTMLInputElement) return;
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.key === 'Enter') {
      const isToggle = current.allowsMany && target.closest('.ve-questions-choices') !== null;
      if (target instanceof HTMLButtonElement && !isToggle) return;
      event.preventDefault();
      confirm();
      return;
    }
    const keyIndex = event.key.length === 1 ? CHOICE_KEYS.indexOf(event.key.toUpperCase()) : -1;
    const suggestion = current.suggestions[keyIndex];
    if (suggestion === undefined) return;
    event.preventDefault();
    pick(suggestion);
  });

  useEffect(() => {
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  if (current === undefined) return null;
  const { question, suggestions, allowsMany, recommended } = current;

  function submit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    confirm();
  }

  function buildNow(): void {
    const confirmed: Answered[] = [];
    for (const answer of answersUntil(replies, position)) {
      if (answer.answer !== '') confirmed.push(answer);
    }
    onBuildNow(confirmed);
  }

  return (
    <form className="ve-questions" onSubmit={submit}>
      <progress
        className="ve-questions-progress"
        aria-labelledby={COUNT_ID}
        max={questions.length}
        value={position + 1}
      />
      <div key={position} className="ve-questions-current">
        <p id={COUNT_ID} className="ve-questions-count">
          Question {position + 1} of {questions.length}
        </p>
        <h3 id={QUESTION_ID} ref={questionRef} tabIndex={-1} className="ve-questions-question">
          {question}
        </h3>
        {allowsMany && <p className="ui-muted">Choose as many as you like.</p>}
        {suggestions.length > 0 && (
          <div className="ve-questions-choices" role="group" aria-labelledby={QUESTION_ID}>
            {suggestions.map((suggestion, index) => {
              const isSuggested = recommended.includes(suggestion);
              const isPicked = reply.picked.includes(suggestion);
              const key = CHOICE_KEYS.charAt(index);
              return (
                <button
                  key={suggestion}
                  type="button"
                  className="ve-questions-choice"
                  aria-label={isSuggested ? `${suggestion} (suggested)` : suggestion}
                  aria-pressed={isPicked}
                  aria-keyshortcuts={key === '' ? undefined : key}
                  onClick={() => pick(suggestion)}
                >
                  <kbd className="ve-questions-key">{key}</kbd>
                  <span className="ve-questions-choice-text">{suggestion}</span>
                  {isSuggested && <span className="ve-questions-suggested">Suggested</span>}
                  {isPicked && <Icon name="check" />}
                </button>
              );
            })}
          </div>
        )}
        <TextInput
          className="ve-questions-own"
          aria-label="Your own answer"
          placeholder="Type your own answer"
          value={reply.typed}
          onChange={(event) => {
            const picked = allowsMany ? reply.picked : [];
            setReplies(withReply({ picked, typed: event.target.value }));
          }}
        />
        <div className="ve-questions-confirm">
          <Button type="submit" variant="primary" icon="check" disabled={answerOf(reply) === ''}>
            OK
          </Button>
          <span className="ui-muted">or press Enter</span>
        </div>
      </div>
      <div className="ve-questions-footer">
        {position > 0 && (
          <Button icon="arrow-up" onClick={() => setPosition(position - 1)}>
            Back
          </Button>
        )}
        <Button onClick={() => advance(withReply(EMPTY_REPLY))}>Skip</Button>
        <Button className="ve-questions-build" onClick={buildNow}>
          Just build it
        </Button>
      </div>
    </form>
  );
}
