import { Injectable } from '@nestjs/common';
import { WireMatchCandidate } from '../entities/wire-match-candidate.entity';

@Injectable()
export class MatchingScoreService {
  async computeScore(candidate: WireMatchCandidate): Promise<number> {
    let score = 0;

    // Memo match bonus
    if (candidate.memo?.includes('MARKETEQ-PROJ-')) score += 40;

    // Project ID present
    if (candidate.resolvedProjectId) score += 20;

    // Amount plausibility (e.g., > 100)
    if (candidate.amount >= 100) score += 15;

    // Recent timestamp bonus (within 2 days)
    const now = new Date();
    const ageMs = now.getTime() - new Date(candidate.receivedAt).getTime();
    const twoDaysMs = 2 * 24 * 60 * 60 * 1000;
    if (ageMs <= twoDaysMs) score += 15;

    // Client linkage stub (placeholder for userService match)
    // integrate user service to check if clientId matches a known user
    if (candidate.clientId) score += 10;

    return Math.min(score, 100);
  }

  async scoreTransaction(tx: {
  id: string;
  memo: string;
  amount: number;
  currency: string;
  created_at: string;
}): Promise<{ score: number; projectId: string | null }> {
  const memo = tx.memo || '';
  const match = memo.match(/MARKETEQ-PROJ-(\w+)/i);
  const now = new Date();
  const txTime = new Date(tx.created_at);
  const ageMs = now.getTime() - txTime.getTime();

  let score = 0;

  if (memo.includes('MARKETEQ-PROJ-')) score += 40;
  if (match) score += 20;
  if (tx.amount >= 100) score += 15;
  if (ageMs <= 2 * 24 * 60 * 60 * 1000) score += 15;
  if (true /* stub for userService check */) score += 10;

  return {
    score: Math.min(score, 100),
    projectId: match ? match[1] : null,
  };
}

}