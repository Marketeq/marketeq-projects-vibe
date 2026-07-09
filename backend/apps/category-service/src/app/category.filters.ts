// Lightweight moderation + fuzzy utilities for user-generated subcategories.
// No external deps; safe defaults you can refine later.

import { Repository, IsNull } from 'typeorm';
import { CategoryEntity } from './entities/category.entity';

/** normalize text for comparisons */
function norm(s: string): string {
  return (s || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .replace(/[_\-]+/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

/** simple bad-word lists (editable) */
const PROFANITY = ['fuck','shit','bitch','asshole'];         // extend as needed
const DRUGS     = ['cocaine','heroin','meth','weed'];        // extend as needed
const TOBACCO   = ['cigarette','vape','nicotine','cigar'];   // extend as needed
const PORN      = ['porn','porno','xxx','nsfw'];             // extend as needed
const GAMBLING  = ['casino','betting','wager','sportsbook']; // extend as needed

function containsWord(list: string[], text: string): boolean {
  const t = ` ${norm(text)} `;
  return list.some(w => t.includes(` ${w} `));
}

/** public checks */
export function checkProfanity(s: string) { return containsWord(PROFANITY, s); }
export function checkDrugs(s: string)     { return containsWord(DRUGS, s); }
export function checkTobacco(s: string)   { return containsWord(TOBACCO, s); }
export function checkPorn(s: string)      { return containsWord(PORN, s); }
export function checkGambling(s: string)  { return containsWord(GAMBLING, s); }

/** tiny fuzzy “spellcheck” — normalize + common typos */
export function fuzzySpellcheck(raw: string): string {
  let s = norm(raw);
  // common dev typos you can tailor
  s = s.replace(/\breact js\b/g, 'reactjs');
  s = s.replace(/\bnext js\b/g, 'nextjs');
  s = s.replace(/\bnode js\b/g, 'nodejs');
  return s.replace(/\s+/g, ' ').trim();
}

/** Jaro–Winkler similarity (0..1). Good for short tech terms. */
function jaroWinkler(a: string, b: string): number {
  // Jaro
  const s1 = a, s2 = b;
  if (!s1.length && !s2.length) return 1;
  const matchDist = Math.floor(Math.max(s1.length, s2.length) / 2) - 1;
  const s1Matches = new Array(s1.length).fill(false);
  const s2Matches = new Array(s2.length).fill(false);
  let matches = 0, transpositions = 0;

  for (let i = 0; i < s1.length; i++) {
    const start = Math.max(0, i - matchDist);
    const end = Math.min(i + matchDist + 1, s2.length);
    for (let j = start; j < end; j++) {
      if (s2Matches[j]) continue;
      if (s1[i] !== s2[j]) continue;
      s1Matches[i] = true;
      s2Matches[j] = true;
      matches++;
      break;
    }
  }
  if (!matches) return 0;

  let k = 0;
  for (let i = 0; i < s1.length; i++) {
    if (!s1Matches[i]) continue;
    while (!s2Matches[k]) k++;
    if (s1[i] !== s2[k]) transpositions++;
    k++;
  }
  const jaro =
    (matches / s1.length +
      matches / s2.length +
      (matches - transpositions / 2) / matches) / 3;

  // Winkler prefix boost
  let prefix = 0;
  const maxPrefix = 4;
  for (let i = 0; i < Math.min(maxPrefix, s1.length, s2.length); i++) {
    if (s1[i] === s2[i]) prefix++;
    else break;
  }
  return jaro + prefix * 0.1 * (1 - jaro);
}

/**
 * Heuristic parent mapping:
 *  - Consider only approved, top-level categories (parentId IS NULL).
 *  - Score by Jaro–Winkler against candidate name.
 *  - Return best match if above threshold.
 */
export async function mapToParentCategory(
  candidateName: string,
  repo: Repository<CategoryEntity>,
  threshold = 0.72,
): Promise<CategoryEntity | null> {
  const top = await repo.find({
    where: { approved: true, parentId: IsNull() },
    order: { name: 'ASC' },
    take: 500, // cap for performance
  });

  const cand = norm(candidateName);
  let best: { score: number; cat: CategoryEntity | null } = { score: 0, cat: null };

  for (const t of top) {
    const score = jaroWinkler(cand, norm(t.name));
    if (score > best.score) best = { score, cat: t };
  }
  return best.score >= threshold ? best.cat : null;
}

/** end-to-end validator used by the service */
export async function validateSubcategory(
  rawName: string,
  repo: Repository<CategoryEntity>,
) {
  const original = rawName ?? '';
  if (!original.trim()) return { valid: false as const, reason: 'Empty' };

  if (checkProfanity(original)) return { valid: false as const, reason: 'Profanity' };
  if (checkDrugs(original))     return { valid: false as const, reason: 'Drugs' };
  if (checkTobacco(original))   return { valid: false as const, reason: 'Tobacco' };
  if (checkPorn(original))      return { valid: false as const, reason: 'Pornography' };
  if (checkGambling(original))  return { valid: false as const, reason: 'Gambling' };

  const correctedName = fuzzySpellcheck(original);
  const parent = await mapToParentCategory(correctedName, repo);

  if (!parent) return { valid: false as const, reason: 'No relevant parent' };

  return {
    valid: true as const,
    name: correctedName,
    parent, // CategoryEntity (top-level)
  };
}
