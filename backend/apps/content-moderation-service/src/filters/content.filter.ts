import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BannedKeyword } from '../entities/banned-keyword.entity';

const DEFAULT_PROFANITY = ['fuck', 'shit', 'asshole', 'bitch', 'cunt', 'nigger', 'faggot'];
const SPAM_PATTERNS = [
  /(.)\1{6,}/,                   // Repeated chars: aaaaaaa
  /(https?:\/\/\S+){3,}/,        // 3+ links
  /\b(buy now|click here|free money|make \$\d+)\b/i,
];

@Injectable()
export class ContentFilter {
  private cachedKeywords: string[] = [...DEFAULT_PROFANITY];
  private lastLoaded = 0;

  constructor(
    @InjectRepository(BannedKeyword)
    private readonly keywordRepo: Repository<BannedKeyword>,
  ) {}

  private async getKeywords(): Promise<string[]> {
    const now = Date.now();
    if (now - this.lastLoaded > 60_000) {
      const rows = await this.keywordRepo.find();
      this.cachedKeywords = [...DEFAULT_PROFANITY, ...rows.map(r => r.keyword.toLowerCase())];
      this.lastLoaded = now;
    }
    return this.cachedKeywords;
  }

  async check(text: string): Promise<{ passed: boolean; reason?: string }> {
    const lower = text.toLowerCase();
    const keywords = await this.getKeywords();

    for (const kw of keywords) {
      if (lower.includes(kw)) return { passed: false, reason: `Banned keyword: ${kw}` };
    }
    for (const pattern of SPAM_PATTERNS) {
      if (pattern.test(text)) return { passed: false, reason: 'Spam pattern detected' };
    }

    return { passed: true };
  }
}
