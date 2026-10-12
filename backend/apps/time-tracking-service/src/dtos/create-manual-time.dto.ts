import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  ValidateBy,
} from 'class-validator';

// BTB-320: notes are limited in visible characters (graphemes), so every emoji
// — ❤️, 👍🏽, 🇮🇳, 👨‍👩‍👧 — counts as one, matching the Log Time counters.
// Intl.Segmenter exists at runtime (Node 16+) but not in this ES2021 lib.
const MAX_NOTES_CHARS = 500;
type GraphemeSegmenter = { segment(input: string): Iterable<unknown> };
const graphemes: GraphemeSegmenter = new (
  Intl as unknown as {
    Segmenter: new (locale: undefined, options: { granularity: 'grapheme' }) => GraphemeSegmenter;
  }
).Segmenter(undefined, { granularity: 'grapheme' });

function MaxGraphemes(max: number) {
  return ValidateBy({
    name: 'maxGraphemes',
    validator: {
      validate: (value: unknown) =>
        typeof value === 'string' && Array.from(graphemes.segment(value)).length <= max,
      defaultMessage: () => `Notes can be at most ${max} characters.`,
    },
  });
}

export class CreateManualTimeDto {
  // AC-76.04 / AC-77.02: manual time is always logged against a contract.
  // One rule, so a missing contract returns a single message.
  @Matches(/\S/, { message: 'Contract is required.' })
  contractId: string;

  @IsOptional()
  @IsString()
  taskId?: string;

  @IsDateString()
  startTime: string;

  @IsDateString()
  endTime: string;

  // BTB-332: whitespace is trimmed, so a spaces-only note is saved as no note.
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() || undefined : value))
  @IsString()
  @MaxGraphemes(MAX_NOTES_CHARS)
  notes?: string;

  // US-78: overlap is a soft, dismissible warning, not a hard block — create()
  // throws ERR_MANUAL_TIME_OVERLAP on first submit; the contractor can resubmit
  // with confirmOverlap: true to proceed anyway.
  @IsOptional()
  @IsBoolean()
  confirmOverlap?: boolean;
}

export class ReviewManualTimeDto {
  @IsEnum(['approved', 'rejected'])
  status: 'approved' | 'rejected';

  @IsOptional()
  @IsString()
  comment?: string;
}
