export type VerticalSpan = { top: number; bottom: number };

export function dropIndexFromSpans(spans: VerticalSpan[], y: number): number {
  const index = spans.findIndex(({ top, bottom }) => y < (top + bottom) / 2);
  return index === -1 ? spans.length : index;
}

export function indicatorY(spans: VerticalSpan[], index: number): number {
  if (spans.length === 0) return 0;
  if (index <= 0) return spans[0].top;
  if (index >= spans.length) return spans[spans.length - 1].bottom;
  return (spans[index - 1].bottom + spans[index].top) / 2;
}

export function finalMoveIndex(from: number, dropIndex: number): number {
  return dropIndex > from ? dropIndex - 1 : dropIndex;
}
