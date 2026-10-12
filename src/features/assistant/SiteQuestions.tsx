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

function answersUntil(
  questions: readonly Question[],
  replies: readonly Reply[],
  end: number,
): Answered[] {
  const answers: Answered[] = [];
  for (const [index, asked] of questions.entries()) {
    if (index === end) break;
    answers.push({ question: asked.question, answer: answerOf(replies[index] ?? EMPTY_REPLY) });
  }
  return answers;
}

function withToggled(picked: readonly string[], suggestion: string): string[] {
  if (picked.includes(suggestion)) return picked.filter((existing) => existing !== suggestion);
  return [...picked, suggestion];
}

function suggestionForKey(key: string, suggestions: readonly string[]): string | undefined {
  const keyIndex = key.length === 1 ? CHOICE_KEYS.indexOf(key.toUpperCase()) : -1;
  return suggestions[keyIndex];
}

type ChoiceListProps = {
  question: Question;
  picked: readonly string[];
  onPick(suggestion: string): void;
};

function ChoiceList({ question, picked, onPick }: ChoiceListProps): JSX.Element {
  return (
    <div className="ve-questions-choices" role="group" aria-labelledby={QUESTION_ID}>
      {question.suggestions.map((suggestion, index) => {
        const isSuggested = question.recommended.includes(suggestion);
        const isPicked = picked.includes(suggestion);
        const key = CHOICE_KEYS.charAt(index);
        return (
          <button
            key={suggestion}
            type="button"
            className="ve-questions-choice"
            aria-label={isSuggested ? `${suggestion} (suggested)` : suggestion}
            aria-pressed={isPicked}
            aria-keyshortcuts={key === '' ? undefined : key}
            onClick={() => onPick(suggestion)}
          >
            <kbd className="ve-questions-key">{key}</kbd>
            <span className="ve-questions-choice-text">{suggestion}</span>
            {isSuggested && <span className="ve-questions-suggested">Suggested</span>}
            {isPicked && <Icon name="check" />}
          </button>
        );
      })}
    </div>
  );
}

type QuestionsFooterProps = {
  canGoBack: boolean;
  onBack(): void;
  onSkip(): void;
  onBuildNow(): void;
};

function QuestionsFooter({
  canGoBack,
  onBack,
  onSkip,
  onBuildNow,
}: QuestionsFooterProps): JSX.Element {
  return (
    <div className="ve-questions-footer">
      {canGoBack && (
        <Button icon="arrow-up" onClick={onBack}>
          Back
        </Button>
      )}
      <Button onClick={onSkip}>Skip</Button>
      <Button className="ve-questions-build" onClick={onBuildNow}>
        Just build it
      </Button>
    </div>
  );
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

  function advance(given: Reply[]): void {
    setReplies(given);
    if (position < questions.length - 1) {
      setPosition(position + 1);
    } else {
      onDone(answersUntil(questions, given, questions.length));
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
    setReplies(withReply({ ...reply, picked: withToggled(reply.picked, suggestion) }));
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
    const suggestion = suggestionForKey(event.key, current.suggestions);
    if (suggestion === undefined) return;
    event.preventDefault();
    pick(suggestion);
  });

  useEffect(() => {
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  if (current === undefined) return null;
  const { question, suggestions, allowsMany } = current;

  function submit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    confirm();
  }

  function buildNow(): void {
    const confirmed: Answered[] = [];
    for (const answer of answersUntil(questions, replies, position)) {
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
          <ChoiceList question={current} picked={reply.picked} onPick={pick} />
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
      <QuestionsFooter
        canGoBack={position > 0}
        onBack={() => setPosition(position - 1)}
        onSkip={() => advance(withReply(EMPTY_REPLY))}
        onBuildNow={buildNow}
      />
    </form>
  );
}
