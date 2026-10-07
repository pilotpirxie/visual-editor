export function classNames(...names: (string | false | null | undefined)[]): string {
  const kept: string[] = [];
  for (const name of names) {
    if (typeof name === 'string' && name !== '') kept.push(name);
  }
  return kept.join(' ');
}
