import { Transform } from 'class-transformer';
import {
  IsIn,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

export const DRAFT_CODE_TYPES = ['gift_card', 'promo'] as const;

export type DraftCodeType = (typeof DRAFT_CODE_TYPES)[number];

const normalizeCode = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toUpperCase() : value;

export class ApplyDraftCodeDto {
  @IsIn(DRAFT_CODE_TYPES)
  type!: DraftCodeType;

  @Transform(normalizeCode)
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  @Matches(/^[^\u0000-\u001F\u007F]+$/, {
    message: 'code must not contain control characters',
  })
  code!: string;
}
