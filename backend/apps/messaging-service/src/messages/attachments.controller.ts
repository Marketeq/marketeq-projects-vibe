import {
  BadRequestException,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { MessagesService } from './messages.service';
import { GatewayAuthGuard } from '../guards/gateway-auth.guard';

const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

const ALLOWED_MIME = new Set([
  // Images
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  // Documents
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv',
  // Archives
  'application/zip',
  // Video
  'video/mp4',
  'video/quicktime',
]);

@UseGuards(GatewayAuthGuard)
@Controller('messaging')
export class AttachmentsController {
  constructor(private readonly messagesService: MessagesService) {}

  @Post('upload')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_UPLOAD_BYTES },
    }),
  )
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any,
  ) {
    if (!file) throw new BadRequestException('file is required');
    if (!ALLOWED_MIME.has(file.mimetype)) {
      throw new BadRequestException(`Unsupported file type: ${file.mimetype}`);
    }

    const threadId = req.body?.conversationId || req.body?.threadId;
    if (!threadId) throw new BadRequestException('conversationId is required');

    const senderId = req.user?.id;
    if (!senderId) throw new BadRequestException('authenticated user required');

    const ciphertext = req.body?.ciphertext || undefined;

    return this.messagesService.uploadAttachment({
      threadId,
      senderId,
      file,
      ciphertext,
    });
  }
}
