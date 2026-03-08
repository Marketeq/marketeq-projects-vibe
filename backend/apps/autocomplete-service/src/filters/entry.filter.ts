import { Injectable } from '@nestjs/common';

const MIN_LENGTH = 2;
const MAX_LENGTH = 100;
const MAX_WORDS = 4;
const VALID_CHARS = /^[a-zA-Z0-9\s\-_.+#@&()'/]+$/;
const NOISE_PATTERN = /^(.)\1{3,}$/;

const PROFANITY = [
  'spam', 'fuck', 'shit', 'ass', 'bitch', 'crap', 'damn', 'hell',
  'bastard', 'piss', 'cock', 'dick', 'pussy', 'whore', 'slut', 'cunt',
  'nigger', 'faggot', 'retard', 'asshole',
];

const NONSENSE_KEYWORDS = [
  'asdf', 'qwerty', 'zxcv', 'test123', 'aaa', 'bbb', 'xxx', 'yyy', 'zzz',
  'foo', 'bar', 'baz', 'lorem', 'ipsum', 'blah', 'blahblah', 'yolo', 'lol',
  'wtf', 'omg', 'idk', 'thisisatest', 'helloworld', 'foobar', 'dummy',
  'placeholder', 'example', 'undefined', 'null', 'none', 'n/a', 'na',
  'test', 'testing', 'temp', 'tmp', 'abc', 'xyz', '123', '1234', '12345',
];

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

    const wordCount = trimmed.trim().split(/\s+/).length;
    if (wordCount > MAX_WORDS)
      return { valid: false, reason: 'too_many_words' };

    const lower = trimmed.toLowerCase();

    for (const word of PROFANITY) {
      if (lower.includes(word))
        return { valid: false, reason: 'profanity' };
    }

    const normalized = this.normalize(trimmed);
    if (NONSENSE_KEYWORDS.includes(normalized))
      return { valid: false, reason: 'nonsense_keyword' };

    // Reject entries that are only numbers
    if (/^\d+$/.test(trimmed))
      return { valid: false, reason: 'numbers_only' };

    // Reject single-character repeated words (e.g. "a a a a")
    const words = lower.split(/\s+/);
    if (words.every(w => w.length === 1))
      return { valid: false, reason: 'noise_pattern' };

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
