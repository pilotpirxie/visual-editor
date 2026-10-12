import { useEffect, useState, type JSX } from 'react';
import { useMediaQuery } from '../../../packages/ui/src';

const TYPE_DELAY_MS = 32;
const ERASE_DELAY_MS = 14;
const HOLD_MS = 3500;
const WHOLE_PHRASE_MS = 4500;
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

type Typing = { index: number; length: number; isErasing: boolean };

type Move = { next: Typing; delay: number };

function nextMove(typing: Typing, phrase: string, hasMore: boolean): Move | null {
  const { index, length, isErasing } = typing;
  if (isErasing && length > 0) {
    return { next: { index, length: length - 1, isErasing }, delay: ERASE_DELAY_MS };
  } else if (isErasing) {
    return { next: { index: index + 1, length: 0, isErasing: false }, delay: TYPE_DELAY_MS };
  } else if (length < phrase.length) {
    return { next: { index, length: length + 1, isErasing }, delay: TYPE_DELAY_MS };
  } else if (hasMore) {
    return { next: { index, length, isErasing: true }, delay: HOLD_MS };
  } else {
    return null;
  }
}

type TypedStatusProps = { phrases: readonly string[] };

export function TypedStatus({ phrases }: TypedStatusProps): JSX.Element {
  const [typing, setTyping] = useState<Typing>({ index: 0, length: 0, isErasing: false });
  const isMotionReduced = useMediaQuery(REDUCED_MOTION_QUERY);
  const hasMore = phrases.length > 1;
  const phrase = phrases[typing.index % phrases.length] ?? '';

  useEffect(() => {
    let move = nextMove(typing, phrase, hasMore);
    if (isMotionReduced) {
      const next = { index: typing.index + 1, length: 0, isErasing: false };
      move = hasMore ? { next, delay: WHOLE_PHRASE_MS } : null;
    }
    if (move === null) return;
    const { next, delay } = move;
    const timer = setTimeout(() => setTyping(next), delay);
    return () => clearTimeout(timer);
  }, [typing, phrase, hasMore, isMotionReduced]);

  return (
    <p className="ve-typed" aria-hidden="true">
      <span className="ve-typed-text">
        {isMotionReduced ? phrase : phrase.slice(0, typing.length)}
      </span>
      <span className="ve-typed-caret" />
    </p>
  );
}
