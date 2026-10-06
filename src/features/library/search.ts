import { CATEGORIES, type RegisteredComponent } from '../../components/types';

const CATEGORY_LABELS = new Map<string, string>(CATEGORIES.map(({ id, label }) => [id, label]));

export function filterComponents(
  components: RegisteredComponent[],
  query: string,
): RegisteredComponent[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return components;
  return components.filter(({ definition }) => {
    const text = [
      definition.name,
      definition.description ?? '',
      ...(definition.tags ?? []),
      CATEGORY_LABELS.get(definition.category) ?? '',
    ]
      .join(' ')
      .toLowerCase();
    return words.every((word) => text.includes(word));
  });
}
