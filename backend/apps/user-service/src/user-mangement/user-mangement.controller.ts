import { Body, Controller, Get, Param, Put } from '@nestjs/common';
import { UserMangementService } from './user-mangement.service';
import { ApiBody, ApiOperation } from '@nestjs/swagger';
import { UpdateUsernameDto } from './dtos/update-username.dto';
import { CheckUsernameDto } from './dtos/check-username.dto';

@Controller('user-management')
export class UserMangementController {
  constructor(private readonly userMangementService: UserMangementService) {}

  @ApiOperation({ summary: 'Check if a username is taken' })
  @ApiBody({ type: CheckUsernameDto })
  @Get('users/check-username')
  checkUsername(@Body() dto: CheckUsernameDto) {
    return this.userMangementService.isUsernameTaken(dto);
  }

  @ApiOperation({ summary: "Update a user's username" })
  @ApiBody({ type: UpdateUsernameDto })
  @Put('users/:userId')
  updateUsername(
    @Param('userId') userId: string,
    @Body() dto: UpdateUsernameDto,
  ) {
    return this.userMangementService.updateUsername(userId, dto);
  }
}
