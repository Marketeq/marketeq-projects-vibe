import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CreateThreadDto } from './dtos/create-thread.dto';
import { ThreadResponseDto } from './dtos/thread-response.dto';
import { MessageService } from './message.service';

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
  @ApiResponse({ status: 404, description: 'Talent not found' })
  createThread(@Body() dto: CreateThreadDto): Promise<ThreadResponseDto> {
    return this.messageService.createOrGetThread(dto);
  }
}
