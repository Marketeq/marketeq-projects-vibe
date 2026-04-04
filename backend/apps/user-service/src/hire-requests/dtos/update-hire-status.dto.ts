import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { HireStatus } from '../enums/hire-status.enums';

export class UpdateHireStatusDto {
  @ApiProperty({
    enum: HireStatus,
    example: HireStatus.ACCEPTED,
    description: 'New status for the hire request',
  })
  @IsEnum(HireStatus)
  status: HireStatus;
}
