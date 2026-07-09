import { Controller, Post, Body } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Notifications')
@Controller('notifications')
export class NotificationsController {
  @ApiOperation({ summary: 'Send notification (mock endpoint)' })
  @Post('send')
  send(@Body() payload: any) {
    console.log('(mock) /notifications/send received payload:', JSON.stringify(payload));
    return { success: true, received: true };
  }
}
