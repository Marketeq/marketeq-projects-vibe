import { IsEnum, IsISO8601, IsOptional } from 'class-validator';
import { DeclaredDuration } from '../../entities/enums/identity-verification.enums';

/**
 * The answer to a "Still traveling?" check-in. `duration` is the only thing that makes it an
 * answer ("not_sure" included; there is deliberately no "skipped" value). `checkInAt` is the
 * `travelReminderAvailableAt` that GET /me showed for the check-in being answered: when it
 * is sent it must still be the current unresolved check-in, so a second tab answering the
 * same occurrence later is rejected instead of restarting the schedule again.
 */
export class TravelCheckInAnswerRequestDto {
  @IsEnum(DeclaredDuration, {
    message:
      'duration must be one of: a_few_days, one_to_two_weeks, more_than_two_weeks, not_sure',
  })
  duration!: DeclaredDuration;

  @IsOptional()
  @IsISO8601({ strict: true })
  checkInAt?: string;
}
