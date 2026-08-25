// apps/offer-service/src/common/dto/work-schedule.dto.ts
// OS-11: Nested DTO for the workSchedule field. hoursPerWeek required only when type=CUSTOM.
import { IsEnum, IsInt, Min, Max, ValidateIf } from 'class-validator';
import { Type } from 'class-transformer';
import { WorkScheduleType } from '../../offers/enums/work-schedule-type.enum';
import { MIN_HOURS_PER_WEEK, MAX_HOURS_PER_WEEK } from '../constants/offer.constants';

export class WorkScheduleDto {
  @IsEnum(WorkScheduleType, {
    message: 'workSchedule.type must be one of: PART_TIME, FULL_TIME, CUSTOM.',
  })
  type: WorkScheduleType;

  @ValidateIf((o: WorkScheduleDto) => o.type === WorkScheduleType.CUSTOM)
  @IsInt({ message: 'workSchedule.hoursPerWeek must be a whole number.' })
  @Min(MIN_HOURS_PER_WEEK, {
    message: `workSchedule.hoursPerWeek must be at least ${MIN_HOURS_PER_WEEK}.`,
  })
  @Max(MAX_HOURS_PER_WEEK, {
    message: `workSchedule.hoursPerWeek cannot exceed ${MAX_HOURS_PER_WEEK}.`,
  })
  @Type(() => Number)
  hoursPerWeek?: number;
}