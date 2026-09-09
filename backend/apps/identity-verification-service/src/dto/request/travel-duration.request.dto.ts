import { IsEnum } from 'class-validator';
import { DeclaredDuration } from '../../entities/enums/identity-verification.enums';

export class TravelDurationRequestDto {
  @IsEnum(DeclaredDuration, {
    message: 'duration must be one of: a_few_days, one_to_two_weeks, more_than_two_weeks, not_sure',
  })
  duration!: DeclaredDuration;
}
