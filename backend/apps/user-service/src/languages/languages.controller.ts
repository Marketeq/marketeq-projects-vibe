import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { CurrentUser } from '../decorators/current-user.decorator';
import { JwtUser } from '../auth/types/jwt-user.type';
import { LanguagesService } from './languages.service';
import { CreateLanguageDto } from './dto/create-language.dto';
import { UpdateLanguageDto } from './dto/update-language.dto';
import { ApiOperation } from '@nestjs/swagger';

@Controller('languages')
export class LanguagesController {
  constructor(private readonly languagesService: LanguagesService) {}

  @ApiOperation({ summary: 'Add languages for the current user' })
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@CurrentUser() user: JwtUser, @Body() dto: CreateLanguageDto) {
    return this.languagesService.create(user.sub, dto);
  }

  @ApiOperation({ summary: 'Find all languages for the current user' })
  @Get()
  @HttpCode(HttpStatus.OK)
  findAll(@Req() req: Request) {
    const user = req.user as JwtUser;
    return this.languagesService.findAll(user.sub);
  }

  @ApiOperation({ summary: 'Update languages for the current user' })
  @Put(':id')
  @HttpCode(HttpStatus.OK)
  update(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: UpdateLanguageDto,
  ) {
    const user = req.user as JwtUser;
    return this.languagesService.update(user.sub, id, dto);
  }

  @ApiOperation({ summary: 'Delete languages for the current user' })
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Req() req: Request, @Param('id') id: string) {
    const user = req.user as JwtUser;
    return this.languagesService.remove(user.sub, id);
  }
}
