import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsString } from 'class-validator';

export class UpdateActiveRoleDto {
  @ApiProperty({ example: 'TALENT', enum: ['TALENT', 'CLIENT'] })
  @IsString()
  @IsNotEmpty()
  @IsIn(['TALENT', 'CLIENT'], { message: 'activeRole must be TALENT or CLIENT' })
  activeRole: string;
}
