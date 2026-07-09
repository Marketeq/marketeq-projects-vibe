import { Injectable } from '@nestjs/common';

class BasicProfanityFilter {
  private words = new Set<string>(['fuck', 'shit', 'bitch', 'asshole', 'bastard', 'dick', 'fucker']);

  addWords(...words: string[]) {
    words.forEach((w) => this.words.add(String(w).toLowerCase()));
  }

  removeWords(...words: string[]) {
    words.forEach((w) => this.words.delete(String(w).toLowerCase()));
  }

  private wordPattern(word: string, flags: string): RegExp {
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`\\b${escaped}(?:s|es|ed|ing|in|er|ers|y)?\\b`, flags);
  }

  isProfane(content: string): boolean {
    const normalized = content.toLowerCase();
    for (const word of this.words) {
      if (this.wordPattern(word, 'i').test(normalized)) return true;
    }
    return false;
  }

  clean(content: string): string {
    let result = content;
    for (const word of this.words) {
      result = result.replace(
        this.wordPattern(word, 'gi'),
        '*'.repeat(word.length),
      );
    }
    return result;
  }
}

// TODO(prod): back profanity sensitivity + custom word list with a DB table;
// currently per-instance ephemeral. Sensitivity set via
// POST /api/moderate/admin/profanity-sensitivity only affects the replica
// that handled the request and is lost on restart. Admin route is gated
// behind AdminGuard.
@Injectable()
export class ProfanityFilterService {
  private filter = new BasicProfanityFilter();
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
