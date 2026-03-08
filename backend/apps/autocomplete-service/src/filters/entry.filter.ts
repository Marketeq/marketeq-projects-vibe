import { Injectable } from '@nestjs/common';

const PROFANITY = ['spam', 'fuck', 'shit', 'ass', 'bitch', 'crap'];
const NOISE_PATTERN = /^(.)\1{3,}$/; // aaaa, 1111, etc.
const MIN_LENGTH = 2;
const MAX_LENGTH = 100;
const VALID_CHARS = /^[a-zA-Z0-9\s\-_.+#@&()'/]+$/;

@Injectable()
export class EntryFilter {
  validate(value: string): { valid: boolean; reason?: string } {
    const trimmed = value.trim();

    if (trimmed.length < MIN_LENGTH)
      return { valid: false, reason: 'too_short' };

    if (trimmed.length > MAX_LENGTH)
      return { valid: false, reason: 'too_long' };

    if (!VALID_CHARS.test(trimmed))
      return { valid: false, reason: 'invalid_characters' };

    if (NOISE_PATTERN.test(trimmed))
      return { valid: false, reason: 'noise_pattern' };

    const lower = trimmed.toLowerCase();
    for (const word of PROFANITY) {
      if (lower.includes(word))
        return { valid: false, reason: 'profanity' };
    }

    return { valid: true };
  }

  normalize(value: string): string {
    return value
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .replace(/['']/g, "'");
  }
}
