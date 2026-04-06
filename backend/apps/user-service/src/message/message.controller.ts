import {
  Body,
  Controller,
  ForbiddenException,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CreateThreadDto } from './dtos/create-thread.dto';
import { ThreadResponseDto } from './dtos/thread-response.dto';
import { MessageService } from './message.service';
import { CurrentUser } from '../decorators/current-user.decorator';
import { JwtUser } from '../auth/types/jwt-user.type';

@Controller('messages')
export class MessageController {
  constructor(private readonly messageService: MessageService) {}

  @Post('threads')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Create or get existing conversation thread' })
  @ApiResponse({
    status: 200,
    type: ThreadResponseDto,
    description: 'Existing thread returned',
  })
  @ApiResponse({
    status: 201,
    type: ThreadResponseDto,
    description: 'New thread created',
  })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  @ApiResponse({ status: 403, description: 'Caller is not a participant' })
  @ApiResponse({ status: 404, description: 'Talent not found' })
  createThread(
    @CurrentUser() user: JwtUser,
    @Body() dto: CreateThreadDto,
  ): Promise<ThreadResponseDto> {
    // The caller must be one of the two participants on the thread —
    // otherwise any authenticated user could open a thread between two
    // arbitrary users and inject an initialMessage "from" the client.
    if (dto.clientUserId !== user.sub && dto.talentUserId !== user.sub) {
      throw new ForbiddenException(
        'You can only create threads you are a participant in',
      );
    }
    return this.messageService.createOrGetThread(dto);
  }
}
