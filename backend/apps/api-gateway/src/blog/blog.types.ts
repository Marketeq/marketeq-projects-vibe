export interface BlogPostListItem {
  id: string;
  slug: string;
  title: string;
  publishedAt: string | null;
  coverImageUrl: string | null;
  authorName: string | null;
  categoryName: string | null;
  tags: string[];
  excerpt: string | null;
  readTimeMinutes: number | null;
}

export interface BlogPostDetail extends BlogPostListItem {
  body: unknown;
}

export interface BlogPostListResponse {
  items: BlogPostListItem[];
  pagination: {
    page: number;
    limit: number;
    totalDocs: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

