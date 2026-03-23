import {
  Controller, Post, Get, Patch, Delete, Body, Param, Query, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { FavoritesService } from '../services/favorites.service';
import { CreateFavoriteDto, CreateGroupDto, UpdateFavoriteDto } from '../dto/create-favorite.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { User } from '../decorators/user.decorator';
import { FavoriteType } from '../entities/favorite.entity';

@Controller('favorites')
@UseGuards(JwtAuthGuard)
export class FavoritesController {
  constructor(private readonly svc: FavoritesService) {}

  // Groups
  @Post('groups')
  @HttpCode(HttpStatus.CREATED)
  createGroup(@Body() dto: CreateGroupDto, @User() user: any) {
    return this.svc.createGroup(dto, user.sub ?? user.id);
  }

  @Get('groups')
  getGroups(@User() user: any) {
    return this.svc.getGroups(user.sub ?? user.id);
  }

  @Delete('groups/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteGroup(@Param('id') id: string, @User() user: any) {
    return this.svc.deleteGroup(id, user.sub ?? user.id);
  }

  // Favorites
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateFavoriteDto, @User() user: any) {
    return this.svc.create(dto, user.sub ?? user.id);
  }

  @Get()
  findAll(@User() user: any, @Query('type') type?: FavoriteType) {
    return this.svc.findAll(user.sub ?? user.id, type);
  }

  @Patch(':id')
  move(@Param('id') id: string, @Body() dto: UpdateFavoriteDto, @User() user: any) {
    return this.svc.move(id, dto, user.sub ?? user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @User() user: any) {
    return this.svc.remove(id, user.sub ?? user.id);
  }

  // RabbitMQ
  @MessagePattern('favorites.create')
  handleCreate(@Payload() data: { dto: CreateFavoriteDto; userId: string }) {
    return this.svc.create(data.dto, data.userId);
  }

  @MessagePattern('favorites.list')
  handleList(@Payload() data: { userId: string; type?: FavoriteType }) {
    return this.svc.findAll(data.userId, data.type);
  }
}
