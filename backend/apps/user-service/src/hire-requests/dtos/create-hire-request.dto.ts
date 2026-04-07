import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CreateHireRequestDto {
  // `clientUserId` is derived from the JWT in the controller and ignored
  // when supplied by the client. Kept here as an optional typed field only
  // so the service receives a complete DTO shape after the controller
  // spreads the overrides on top.
  @ApiPropertyOptional({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Deprecated — derived from the authenticated caller',
  })
  @IsOptional()
  @IsUUID()
  clientUserId?: string;

  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Unique identifier of the talent user being hired',
  })
  @IsUUID()
  talentUserId: string;

  @ApiPropertyOptional({
    example: 'I am interested in working with you on this project.',
    description: 'Message to the talent user',
  })
  @IsOptional()
  @IsString()
  message?: string;

  @ApiProperty({
    example: 1000,
    description: 'Budget for the project in USD',
  })
  @IsNumber()
  @Min(0)
  budgetUsd: number;

  @ApiPropertyOptional({
    example: 'Web Development',
    description: 'Type of project',
  })
  @IsOptional()
  @IsString()
  projectType?: string;
}
