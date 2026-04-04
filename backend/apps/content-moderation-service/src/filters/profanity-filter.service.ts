import { Injectable } from '@nestjs/common';
const Filter = require('bad-words');

@Injectable()
export class ProfanityFilterService {
  private filter = new Filter();
  constructor() {
    this.extendProfanityList();
  }
  private extendProfanityList() {
    const customWords = ['puta', 'mierda', 'freaking', 'heck', 'bloody']; 
    this.filter.addWords(...customWords);
  }
  adjustSensitivity(sensitivity: string) {
    if (sensitivity === 'strict') {
      this.filter.addWords('darn', 'crap'); 
    } else if (sensitivity === 'loose') {
      this.filter.removeWords('sucks', 'lame', 'dumb'); 
    }
  }
  private normalizeContent(content: string): string {
    return content.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  }
  async check(content: string): Promise<{ failed: boolean }> {
    if (typeof content !== 'string' || !content) {
      // If content is null, undefined, or not a string, treat as clean
      return { failed: false };
    }
    try {
      const isCleanOriginal = this.filter.clean(content) === content;
      const normalized = this.normalizeContent(content);
      const isCleanNormalized = this.filter.clean(normalized) === normalized;
      return { failed: !(isCleanOriginal && isCleanNormalized) };
    } catch (e) {
      // If bad-words throws, treat as clean (or optionally as failed: true)
      return { failed: false };
    }
  }
}
