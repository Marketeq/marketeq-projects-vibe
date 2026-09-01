const MAX_SLUG_LENGTH = 100;
// Leave room for a numeric conflict suffix like "-23" appended by SlugService.
const MAX_BASE_SLUG_LENGTH = 90;

export function slugify(input: string, maxLength: number = MAX_BASE_SLUG_LENGTH): string {
  const slug = input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, maxLength)
    .replace(/-+$/g, '');

  return slug || 'untitled';
}

export { MAX_SLUG_LENGTH };
