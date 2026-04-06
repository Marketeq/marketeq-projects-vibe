import { Injectable } from '@nestjs/common';

function decodeHtmlEntities(input: string): string {
  return input
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    Array(n + 1).fill(0),
  );

  for (let i = 0; i <= m; i += 1) dp[i][0] = i;
  for (let j = 0; j <= n; j += 1) dp[0][j] = j;

  for (let i = 1; i <= m; i += 1) {
    for (let j = 1; j <= n; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost,
      );
    }
  }

  return dp[m][n];
}

@Injectable()
export class BannedKeywordsService {
  private bannedKeywords = [
    'adult',
    'violence',
    'hate',
    'muerte',
    'scam',
    'fraud',
    'phishing',
    'fake',
    'counterfeit',
    'illegal',
  ];
  private negativeLexicon = [
    'hate',
    'horrible',
    'terrible',
    'awful',
    'stupid',
    'idiot',
    'kill',
    'die',
    'trash',
    'worst',
  ];

  private preprocess(content: string): string {
    const decoded = decodeHtmlEntities(content);
    return decoded.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  }

  private isFuzzyMatch(input: string, keyword: string): boolean {
    const distance = levenshteinDistance(input, keyword);
    return distance <= 2;
  }

  private scoreSentiment(content: string): number {
    const tokens = content.toLowerCase().match(/[a-z0-9']+/g) ?? [];
    let score = 0;
    for (const token of tokens) {
      if (this.negativeLexicon.includes(token)) score -= 1;
    }
    return score;
  }

  async check(content: string): Promise<{ failed: boolean; reason?: string }> {
    const lowerContent = content.toLowerCase();
    const normalized = this.preprocess(content);

    const hasBannedKeyword = this.bannedKeywords.some((keyword) => {
      return (
        lowerContent.includes(keyword) ||
        this.isFuzzyMatch(normalized, keyword)
      );
    });

    if (hasBannedKeyword) {
      return { failed: true, reason: 'Banned keyword detected (exact or fuzzy)' };
    }

    const sentimentScore = this.scoreSentiment(content);
    if (sentimentScore < -2) {
      return { failed: true, reason: 'Negative sentiment detected' };
    }

    return { failed: false };
  }

  async add(newKeyword: string): Promise<void> {
    if (typeof newKeyword !== 'string' || !newKeyword.trim()) {
      throw new Error('Keyword must be a non-empty string');
    }
    this.bannedKeywords.push(newKeyword.toLowerCase());
  }

  getAll(): string[] {
    return this.bannedKeywords;
  }
}
