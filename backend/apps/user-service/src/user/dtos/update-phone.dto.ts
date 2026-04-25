import { IsOptional, IsString, Matches } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdatePhoneDto {
  @ApiPropertyOptional({
    example: '+15551234567',
    description: 'E.164-style phone number. Pass null to clear.',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @Matches(/^\+?[1-9]\d{6,14}$/, {
    message: 'phone must be a valid E.164-style phone number',
  })
  phone?: string | null;
}
