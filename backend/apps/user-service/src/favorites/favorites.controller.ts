import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { FavoritesService } from './favorites.service';
import { ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { CreateFavoritesDto } from './dto/add-favorites.dto';
import { CurrentUser } from '../decorators/current-user.decorator';
import { JwtUser } from '../auth/types/jwt-user.type';

@Controller('favorites')
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  @ApiOperation({ summary: 'Create a favorite for the current user' })
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@CurrentUser() user: JwtUser, @Body() dto: CreateFavoritesDto) {
    return this.favoritesService.create(user.sub, dto);
  }

  @ApiOperation({ summary: 'Find all favorites for the current user' })
  @Get()
  @HttpCode(HttpStatus.OK)
  findAll(@CurrentUser() user: JwtUser) {
    return this.favoritesService.findAll(user.sub);
  }

  @ApiOperation({ summary: 'Remove a favorite for the current user' })
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  remove(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return this.favoritesService.remove(user.sub, id);
  }
}
