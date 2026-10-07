import { CATEGORIES, type ComponentDefinition } from '../../components/types';

type Searchable = { definition: ComponentDefinition };

const WHITESPACE = /\s+/;

function categoryLabel(categoryId: string): string {
  for (const category of CATEGORIES) {
    if (category.id === categoryId) return category.label;
  }
  return '';
}

function searchableText(component: Searchable): string {
  const { definition } = component;
  const parts = [
    definition.name,
    definition.description ?? '',
    ...(definition.tags ?? []),
    categoryLabel(definition.category),
  ];
  return parts.join(' ').toLowerCase();
}

export function searchWords(query: string): string[] {
  const words: string[] = [];
  for (const word of query.toLowerCase().split(WHITESPACE)) {
    if (word !== '') words.push(word);
  }
  return words;
}

export function matchesWords(text: string, words: readonly string[]): boolean {
  const lowerCase = text.toLowerCase();
  return words.every((word) => lowerCase.includes(word));
}

export function filterComponents<Entry extends Searchable>(
  components: Entry[],
  query: string,
): Entry[] {
  const words = searchWords(query);
  if (words.length === 0) return components;
  const matches: Entry[] = [];
  for (const component of components) {
    if (matchesWords(searchableText(component), words)) matches.push(component);
  }
  return matches;
}
