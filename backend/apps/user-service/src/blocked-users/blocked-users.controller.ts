import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { BlockedUsersService } from './blocked-users.service';
import { CurrentUser } from '../decorators/current-user.decorator';
import { JwtUser } from '../auth/types/jwt-user.type';
import { CreateBlockDto } from './dto/create-block.dto';
import { BlockedUserDto } from './dto/block-status.dto';

@ApiTags('blocked-users')
@Controller('users')
export class BlockedUsersController {
  constructor(private readonly blockedUsersService: BlockedUsersService) {}

  @ApiOperation({ summary: 'Block a user' })
  @ApiOkResponse({ type: BlockedUserDto })
  @Post(':id/block')
  @HttpCode(HttpStatus.CREATED)
  block(
    @CurrentUser() user: JwtUser,
    @Param('id') id: string,
    @Body() dto: CreateBlockDto,
  ) {
    return this.blockedUsersService.block(user.sub, id, dto);
  }

  @ApiOperation({ summary: 'Unblock a user' })
  @Delete(':id/block')
  @HttpCode(HttpStatus.OK)
  unblock(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return this.blockedUsersService.unblock(user.sub, id);
  }

  @ApiOperation({ summary: 'List users blocked by the current user' })
  @ApiOkResponse({ type: [BlockedUserDto] })
  @Get('me/blocked')
  @HttpCode(HttpStatus.OK)
  listBlocked(@CurrentUser() user: JwtUser) {
    return this.blockedUsersService.listBlocked(user.sub);
  }
}
