import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dtos/create-user.dto';
import { UpdateUserDto } from './dtos/update-user.dto';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserAccessGuard } from '../guards/user-access.guard';

@ApiTags('User')
@Controller('users')
// Ownership and privilege checks. These routes have only the global
// JwtAuthGuard, so any signed-in caller can currently edit, delete or re-role
// any account and list every user. The guard ships in MONITOR mode: it logs
// what it would reject and changes nothing until USER_ACCESS_MODE=enforce.
// Service-to-service callers (profile sync) are exempt via the internal token.
@UseGuards(UserAccessGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @ApiOperation({ summary: 'Create user' })
  @Post()
  createUser(@Body() dto: CreateUserDto) {
    return this.userService.createUser(dto);
  }

  @ApiOperation({ summary: 'List users' })
  @Get()
  listUsers(
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const parsedLimit = Number(limit ?? '50');
    const parsedOffset = Number(offset ?? '0');

    return this.userService.listUsers(parsedLimit, parsedOffset);
  }

  // Must stay above @Get(':id'), because Nest matches routes in declaration order,
  // so below it 'count' would bind as an :id and fail UUID lookup.
  @ApiOperation({ summary: 'Count users' })
  @Get('count')
  countUsers() {
    return this.userService.countUsers();
  }

  @ApiOperation({ summary: 'Get user by id' })
  @Get(':id')
  getUser(@Param('id') id: string) {
    return this.userService.getUserById(id);
  }

  @ApiOperation({ summary: 'Update user by id' })
  @Patch(':id')
  updateUser(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.userService.updateUser(id, dto);
  }

  @ApiOperation({ summary: 'Delete user by id' })
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteUser(@Param('id') id: string) {
    return this.userService.deleteUser(id);
  }
}
