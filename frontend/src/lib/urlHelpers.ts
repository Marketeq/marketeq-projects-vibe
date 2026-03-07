export function extractIdFromSlug(slugId: string): string {
    const parts = slugId.split('-');
    const lastPart = parts[parts.length - 1];
    if (/^\d+$/.test(lastPart)) return lastPart;
    throw new Error('Invalid slug-id format');
}

export function buildProjectUrl(
    categorySlugPath: string[], // Not used in Option 2, but keep for future
    slug: string,
    id: number | string
): string {
    // Simple MVP version - /project-details/{slug}-{id}
    return `/project-details/${slug}-${id}`;
}

export function parseCategoryParams(params: { category?: string[] }) {
    const parts = (params.category ?? []).map(String);
    if (parts.length < 1 || parts.length > 3) throw new Error('Invalid category depth');
    const [l1, l2, l3] = parts;
    return { l1, l2, l3, slugPath: parts.filter(Boolean) as string[] };
}