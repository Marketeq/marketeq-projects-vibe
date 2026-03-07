import { Controller, Post, Delete, Param, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { MediaService } from './media.service';

@Controller('v1/media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  upload(@UploadedFile() file: Express.Multer.File) {
    return this.mediaService.upload(file);
  }

  @Delete(':key')
  remove(@Param('key') key: string) {
    return this.mediaService.delete(key);
  }
}
