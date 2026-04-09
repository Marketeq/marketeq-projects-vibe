/**
 * Homepage evaluator — scores and ranks listing items by kind.
 *
 * Implements the scoring blends from the homepage spec (doc 07):
 *   - top_rated:     rating 40%, completions 15%, revenue 15%, CTR 10%, boost 10%, health 10%
 *   - trending:      CTR 40%, impressions 30%, recency 30%
 *   - most_popular:  completions 40%, views_90d 35%, recency 15%, boost 10%
 *   - newest:        pure chronological (createdAt DESC)
 */

/** Raw item shape — superset of what listings-service may return */
export interface ScoredItem {
  id: string;
  createdAt: string;
  updatedAt?: string;
  rating?: number;
  reviewCount?: number;
  completionsCount?: number;
  views90d?: number;
  impressions?: number;
  ctr?: number;
  adminBoost?: number;
  revenue?: number;
  budget?: number | null;
  skills?: string[];
  categories?: string[];
  [key: string]: any;
}

type Kind = 'newest' | 'top_rated' | 'trending' | 'most_popular';

/** Precomputed pool maxima — computed once per scoring pass, not per item */
interface PoolMaxima {
  rating: number;
  completions: number;
  revenue: number;
  ctr: number;
  boost: number;
  impressions: number;
  views: number;
}

/**
 * Score and rank items by kind. Returns a new sorted array (does not mutate input).
 * Fetches 3× the limit for the scoring pool, scores, then trims to limit.
 */
export function evaluateItems<T extends ScoredItem>(
  items: T[],
  kind: Kind,
  limit: number,
): T[] {
  if (kind === 'newest') {
    return [...items]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
  }

  const pool = [...items].slice(0, limit * 3);
  if (pool.length === 0) return [];

  const maxima = computePoolMaxima(pool);

  const scored = pool.map((item) => ({
    item,
    score: computeScore(item, kind, maxima),
  }));

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((s) => s.item);
}

function computePoolMaxima(pool: ScoredItem[]): PoolMaxima {
  return {
    rating: poolMax(pool, (i) => i.rating ?? 0),
    completions: poolMax(pool, (i) => i.completionsCount ?? 0),
    revenue: poolMax(pool, (i) => i.revenue ?? (i.budget as number) ?? 0),
    ctr: poolMax(pool, (i) => i.ctr ?? 0),
    boost: poolMax(pool, (i) => i.adminBoost ?? 0),
    impressions: poolMax(pool, (i) => i.impressions ?? 0),
    views: poolMax(pool, (i) => i.views90d ?? 0),
  };
}

function computeScore(item: ScoredItem, kind: Kind, maxima: PoolMaxima): number {
  switch (kind) {
    case 'top_rated':
      return scoreTopRated(item, maxima);
    case 'trending':
      return scoreTrending(item, maxima);
    case 'most_popular':
      return scoreMostPopular(item, maxima);
    default:
      return 0;
  }
}

// ── Normalization helper ────────────────────────────────────────────────────
function normalize(value: number, max: number): number {
  if (max <= 0) return 0;
  return Math.min(value / max, 1);
}

function poolMax(pool: ScoredItem[], getter: (item: ScoredItem) => number): number {
  return pool.reduce((max, item) => Math.max(max, getter(item)), 1);
}

function recencyScore(createdAt: string, windowDays = 90): number {
  const daysSince = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24);
  return Math.max(0, 1 - daysSince / windowDays);
}

// ── Top Rated ───────────────────────────────────────────────────────────────
// rating 40%, completions 15%, revenue 15%, CTR 10%, boost 10%, health 10%
function scoreTopRated(item: ScoredItem, m: PoolMaxima): number {
  const normRating = normalize(item.rating ?? 0, m.rating);
  const normCompletions = normalize(item.completionsCount ?? 0, m.completions);
  const normRevenue = normalize(item.revenue ?? (item.budget as number) ?? 0, m.revenue);
  const normCtr = normalize(item.ctr ?? 0, m.ctr);
  const normBoost = normalize(item.adminBoost ?? 0, m.boost);
  const healthScore = Math.min(1, ((item.skills?.length ?? 0) / 5) * 0.7 + (item.thumbnail ? 0.3 : 0));

  const hasData = (item.rating ?? 0) > 0 || (item.completionsCount ?? 0) > 0;
  if (!hasData) {
    return recencyScore(item.createdAt, 180) * 0.5 + healthScore * 0.5;
  }

  return (
    normRating * 0.40 +
    normCompletions * 0.15 +
    normRevenue * 0.15 +
    normCtr * 0.10 +
    normBoost * 0.10 +
    healthScore * 0.10
  );
}

// ── Trending ────────────────────────────────────────────────────────────────
// CTR 40%, impressions 30%, recency 30%
function scoreTrending(item: ScoredItem, m: PoolMaxima): number {
  const normCtr = normalize(item.ctr ?? 0, m.ctr);
  const normImpressions = normalize(item.impressions ?? 0, m.impressions);
  const normRecency = recencyScore(item.createdAt, 30);

  const hasData = (item.ctr ?? 0) > 0 || (item.impressions ?? 0) > 0;
  if (!hasData) {
    return normRecency;
  }

  return normCtr * 0.40 + normImpressions * 0.30 + normRecency * 0.30;
}

// ── Most Popular ────────────────────────────────────────────────────────────
// completions 40%, views_90d 35%, recency 15%, boost 10%
function scoreMostPopular(item: ScoredItem, m: PoolMaxima): number {
  const normCompletions = normalize(item.completionsCount ?? 0, m.completions);
  const normViews = normalize(item.views90d ?? 0, m.views);
  const normRecency = recencyScore(item.createdAt, 90);
  const normBoost = normalize(item.adminBoost ?? 0, m.boost);

  const hasData = (item.completionsCount ?? 0) > 0 || (item.views90d ?? 0) > 0;
  if (!hasData) {
    const budgetSignal = item.budget ? Math.min(1, (item.budget as number) / 100000) : 0;
    return normRecency * 0.6 + budgetSignal * 0.4;
  }

  return normCompletions * 0.40 + normViews * 0.35 + normRecency * 0.15 + normBoost * 0.10;
}
