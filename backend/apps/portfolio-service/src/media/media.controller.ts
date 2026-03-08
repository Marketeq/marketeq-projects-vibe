import { Controller, Post, Delete, Body, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { MediaService } from './media.service';
import { GenerateUploadDto, DeleteFileDto } from './media.dto';

@Controller('media')
@UseGuards(AuthGuard('jwt'))
export class MediaController {
  constructor(private readonly media: MediaService) {}

  @Post('upload')
  @HttpCode(HttpStatus.OK)
  getSignedUpload(@Body() dto: GenerateUploadDto) {
    return this.media.generateUpload(dto.fileName, dto.fileSize);
  }

  @Delete('remove')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeFile(@Query() dto: DeleteFileDto) {
    return this.media.deleteFile(dto.key);
  }
}
