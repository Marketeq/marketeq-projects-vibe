import { Injectable } from '@nestjs/common';
const Sentiment = require('sentiment');
const he = require('he'); 
const levenshtein = require('fast-levenshtein'); 

@Injectable()
export class BannedKeywordsService {
   
  private bannedKeywords = ['adult', 'violence', 'hate', 'muerte']; 
  private sentiment = new Sentiment();

  
  private preprocess(content: string): string {
    const decoded = he.decode(content); 
    return decoded.replace(/[^a-zA-Z0-9]/g, '').toLowerCase(); 
  }

  private isFuzzyMatch(input: string, keyword: string): boolean {
    const distance = levenshtein.get(input, keyword);
    return distance <= 2; 
  }

  async check(content: string): Promise<{ failed: boolean; reason?: string }> {
    const lowerContent = content.toLowerCase();
    const normalized = this.preprocess(content);

    
    const hasBannedKeyword = this.bannedKeywords.some(keyword => {
      return (
        lowerContent.includes(keyword) ||
        this.isFuzzyMatch(normalized, keyword)
      );
    });

    if (hasBannedKeyword) {
      return { failed: true, reason: 'Banned keyword detected (exact or fuzzy)' };
    }

    const sentimentResult = this.sentiment.analyze(content);
    if (sentimentResult.score < -2) {
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
