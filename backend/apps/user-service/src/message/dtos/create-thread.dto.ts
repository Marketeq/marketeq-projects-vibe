import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class CreateThreadDto {
  @ApiProperty({ example: 'usr_client_456' })
  @IsUUID()
  @IsNotEmpty()
  clientUserId: string;

  @ApiProperty({ example: 'usr_talent_123' })
  @IsUUID()
  @IsNotEmpty()
  talentUserId: string;

  @ApiProperty({ example: "Hello! I'd like to discuss a project." })
  @IsString()
  initialMessage: string;
}
