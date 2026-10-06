const DIACRITICS = /\p{Diacritic}/gu;
const NOT_SLUG_CHARACTERS = /[^a-z0-9]+/g;
const EDGE_HYPHENS = /^-+|-+$/g;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const FALLBACK_SLUG = 'page';
const RESERVED_SLUGS = ['index'];

export function slugify(name: string): string {
  const slug = name
    .normalize('NFKD')
    .replace(DIACRITICS, '')
    .toLowerCase()
    .replace(NOT_SLUG_CHARACTERS, '-')
    .replace(EDGE_HYPHENS, '');
  return slug === '' ? FALLBACK_SLUG : slug;
}

export function uniqueSlug(wanted: string, takenSlugs: readonly string[]): string {
  const base = slugify(wanted);
  const isTaken = (slug: string) => takenSlugs.includes(slug) || RESERVED_SLUGS.includes(slug);
  if (!isTaken(base)) return base;
  let suffix = 2;
  while (isTaken(`${base}-${suffix}`)) suffix += 1;
  return `${base}-${suffix}`;
}

export function slugError(slug: string, takenSlugs: readonly string[]): string | null {
  if (slug === '') {
    return 'Enter a slug';
  } else if (!SLUG.test(slug)) {
    return 'Use lowercase letters, digits and single hyphens';
  } else if (RESERVED_SLUGS.includes(slug)) {
    return `“${slug}” is reserved for the home page file`;
  } else if (takenSlugs.includes(slug)) {
    return 'Another page already uses this slug';
  } else {
    return null;
  }
}
