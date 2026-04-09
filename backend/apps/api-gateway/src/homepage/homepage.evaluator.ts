/**
 * Homepage evaluator — scores and ranks listing items by kind.
 *
 * Implements the scoring blends from the homepage spec (doc 07):
 *   - top_rated:     rating 40%, completions 15%, revenue 15%, CTR 10%, boost 10%, health 10%
 *   - trending:      CTR 40%, impressions 30%, recency 30%
 *   - most_popular:  completions 40%, views_90d 35%, recency 15%, boost 10%
 *   - newest:        pure chronological (createdAt DESC)
 *
 * Since listings-service doesn't yet expose rating/views/completions,
 * the evaluator uses proxy signals from available fields and gracefully
 * falls back to createdAt when scoring data is missing. When the
 * listings entity gains these fields, the scoring will automatically
 * use them — no code change needed.
 */

/** Raw item shape — superset of what listings-service may return */
export interface ScoredItem {
  id: string;
  createdAt: string;
  updatedAt?: string;
  // Scoring signals — all optional; evaluator uses what's available
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

  // Build scoring pool (3× limit for better ranking fidelity)
  const pool = [...items].slice(0, limit * 3);
  if (pool.length === 0) return [];

  const scored = pool.map((item) => ({
    item,
    score: computeScore(item, kind, pool),
  }));

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((s) => s.item);
}

function computeScore(item: ScoredItem, kind: Kind, pool: ScoredItem[]): number {
  switch (kind) {
    case 'top_rated':
      return scoreTopRated(item, pool);
    case 'trending':
      return scoreTrending(item, pool);
    case 'most_popular':
      return scoreMostPopular(item, pool);
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
  return Math.max(...pool.map(getter), 1);
}

function recencyScore(createdAt: string, windowDays = 90): number {
  const daysSince = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24);
  return Math.max(0, 1 - daysSince / windowDays);
}

// ── Top Rated ───────────────────────────────────────────────────────────────
// rating 40%, completions 15%, revenue 15%, CTR 10%, boost 10%, health 10%
function scoreTopRated(item: ScoredItem, pool: ScoredItem[]): number {
  const maxRating = poolMax(pool, (i) => i.rating ?? 0);
  const maxCompletions = poolMax(pool, (i) => i.completionsCount ?? 0);
  const maxRevenue = poolMax(pool, (i) => i.revenue ?? i.budget ?? 0);
  const maxCtr = poolMax(pool, (i) => i.ctr ?? 0);
  const maxBoost = poolMax(pool, (i) => i.adminBoost ?? 0);

  const normRating = normalize(item.rating ?? 0, maxRating);
  const normCompletions = normalize(item.completionsCount ?? 0, maxCompletions);
  const normRevenue = normalize(item.revenue ?? (item.budget as number) ?? 0, maxRevenue);
  const normCtr = normalize(item.ctr ?? 0, maxCtr);
  const normBoost = normalize(item.adminBoost ?? 0, maxBoost);
  // Health factor: proxy from skills richness + has thumbnail
  const healthScore = Math.min(1, ((item.skills?.length ?? 0) / 5) * 0.7 + (item.thumbnail ? 0.3 : 0));

  // When no scoring data is available, fall back to recency
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
function scoreTrending(item: ScoredItem, pool: ScoredItem[]): number {
  const maxCtr = poolMax(pool, (i) => i.ctr ?? 0);
  const maxImpressions = poolMax(pool, (i) => i.impressions ?? 0);

  const normCtr = normalize(item.ctr ?? 0, maxCtr);
  const normImpressions = normalize(item.impressions ?? 0, maxImpressions);
  const normRecency = recencyScore(item.createdAt, 30);

  // When no engagement data, use pure recency
  const hasData = (item.ctr ?? 0) > 0 || (item.impressions ?? 0) > 0;
  if (!hasData) {
    return normRecency;
  }

  return normCtr * 0.40 + normImpressions * 0.30 + normRecency * 0.30;
}

// ── Most Popular ────────────────────────────────────────────────────────────
// completions 40%, views_90d 35%, recency 15%, boost 10%
function scoreMostPopular(item: ScoredItem, pool: ScoredItem[]): number {
  const maxCompletions = poolMax(pool, (i) => i.completionsCount ?? 0);
  const maxViews = poolMax(pool, (i) => i.views90d ?? 0);
  const maxBoost = poolMax(pool, (i) => i.adminBoost ?? 0);

  const normCompletions = normalize(item.completionsCount ?? 0, maxCompletions);
  const normViews = normalize(item.views90d ?? 0, maxViews);
  const normRecency = recencyScore(item.createdAt, 90);
  const normBoost = normalize(item.adminBoost ?? 0, maxBoost);

  // When no engagement data, use recency + budget as popularity proxy
  const hasData = (item.completionsCount ?? 0) > 0 || (item.views90d ?? 0) > 0;
  if (!hasData) {
    const budgetSignal = item.budget ? Math.min(1, (item.budget as number) / 100000) : 0;
    return normRecency * 0.6 + budgetSignal * 0.4;
  }

  return normCompletions * 0.40 + normViews * 0.35 + normRecency * 0.15 + normBoost * 0.10;
}
