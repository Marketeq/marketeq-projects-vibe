import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

import {
  MAX_SECURITY_ANSWERS,
  REQUIRED_SECURITY_ANSWERS,
  SECURITY_QUESTION_CATALOG,
} from '../../security-questions/security-questions.catalog';

const CATALOG_IDS = SECURITY_QUESTION_CATALOG.map((question) => question.id);

export class SecurityQuestionAnswerDto {
  @ApiProperty({ enum: CATALOG_IDS })
  @IsString()
  @IsIn(CATALOG_IDS, { message: 'Unknown security question.' })
  questionId: string;

  @ApiProperty({ description: 'Free text; compared case- and whitespace-insensitively' })
  @IsString()
  @IsNotEmpty()
  // Long enough for a sentence answer, short enough that the endpoint is not a
  // place to post a payload. Nothing displays this back, so there is no reason
  // for it to be large.
  @MaxLength(200)
  answer: string;
}

export class SetSecurityQuestionsDto {
  @ApiProperty({ type: [SecurityQuestionAnswerDto] })
  @IsArray()
  @ArrayMinSize(REQUIRED_SECURITY_ANSWERS)
  @ArrayMaxSize(MAX_SECURITY_ANSWERS)
  @ValidateNested({ each: true })
  @Type(() => SecurityQuestionAnswerDto)
  answers: SecurityQuestionAnswerDto[];
}

export class VerifySecurityQuestionsDto {
  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty({ type: [SecurityQuestionAnswerDto] })
  @IsArray()
  @ArrayMinSize(REQUIRED_SECURITY_ANSWERS)
  @ArrayMaxSize(MAX_SECURITY_ANSWERS)
  @ValidateNested({ each: true })
  @Type(() => SecurityQuestionAnswerDto)
  answers: SecurityQuestionAnswerDto[];
}
