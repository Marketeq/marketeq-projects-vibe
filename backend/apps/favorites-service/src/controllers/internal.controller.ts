import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { Public } from '../decorators/public.decorator';
import { FavoriteType } from '../entities/favorite.entity';
import { ServiceAuthGuard } from '../auth/service-auth.guard';
import { TargetValidationService } from '../services/target-validation.service';
import { IsEnum, IsString, IsUUID } from 'class-validator';

class ValidateTargetDto {
  @ApiProperty({
    description: 'Favorite target type',
    enum: FavoriteType,
    example: FavoriteType.PROJECT,
  })
  @IsEnum(FavoriteType)
  type: FavoriteType;

  @ApiProperty({
    description: 'The UUID of the target to validate',
    example: '73c2d1dc-f844-400c-b974-b910940a2ebe',
  })
  @IsString()
  @IsUUID()
  itemId: string;
}

@Controller('internal/favorites')
@Public()
@UseGuards(ServiceAuthGuard)
export class InternalController {
  constructor(
    private readonly targetValidationService: TargetValidationService,
  ) {}

  @Post('validate-target')
  validateTarget(@Body() dto: ValidateTargetDto) {
    return this.targetValidationService.validateTarget(dto.type, dto.itemId);
  }
}
