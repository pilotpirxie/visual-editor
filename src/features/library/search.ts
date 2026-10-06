import { CATEGORIES, type RegisteredComponent } from '../../components/types';

const WHITESPACE = /\s+/;

function categoryLabel(categoryId: string): string {
  for (const category of CATEGORIES) {
    if (category.id === categoryId) return category.label;
  }
  return '';
}

function searchableText(component: RegisteredComponent): string {
  const { definition } = component;
  const parts = [
    definition.name,
    definition.description ?? '',
    ...(definition.tags ?? []),
    categoryLabel(definition.category),
  ];
  return parts.join(' ').toLowerCase();
}

function searchWords(query: string): string[] {
  const words: string[] = [];
  for (const word of query.toLowerCase().split(WHITESPACE)) {
    if (word !== '') words.push(word);
  }
  return words;
}

export function filterComponents(
  components: RegisteredComponent[],
  query: string,
): RegisteredComponent[] {
  const words = searchWords(query);
  if (words.length === 0) return components;
  const matches: RegisteredComponent[] = [];
  for (const component of components) {
    const text = searchableText(component);
    if (words.every((word) => text.includes(word))) matches.push(component);
  }
  return matches;
}
