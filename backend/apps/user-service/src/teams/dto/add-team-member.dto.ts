import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class AddTeamMemberDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'User ID to add to the team',
  })
  @IsString()
  userId: string;

  @ApiProperty({
    example: 'member',
    description: 'Role of the team member',
    required: false,
  })
  @IsString()
  @IsOptional()
  role?: string;
}
