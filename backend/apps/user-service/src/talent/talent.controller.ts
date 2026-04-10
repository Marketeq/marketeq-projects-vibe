import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CurrentUser } from '../decorators/current-user.decorator';
import { Public } from '../decorators/public.decorator';

import { TalentService } from './talent.service';
import { CreateTalentDto } from './dto/create-talent.dto';
import { JwtUser } from '../auth/types/jwt-user.type';

@ApiBearerAuth()
@Controller('talent')
export class TalentController {
  constructor(private readonly talentService: TalentService) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('avatar', {
      storage: memoryStorage(),
    }),
  )
  createTalent(
    @CurrentUser() user: JwtUser,
    @Body() dto: CreateTalentDto,
    @UploadedFile() avatar?: Express.Multer.File,
  ) {
    const userId = user.sub ?? user.id;
    return this.talentService.createTalent({ id: userId, email: user.email }, dto, avatar);
  }

  @ApiOperation({ summary: 'Public list of talent users for browse pages' })
  @Public()
  @Get('users')
  listTalentUsers() {
    return this.talentService.listTalentUsers();
  }

  @ApiOperation({ summary: 'Get user by username' })
  @Public()
  @Get('users/:username')
  getUserByUsername(@Param('username') username: string) {
    return this.talentService.getUserByUsername(username);
  }
}
