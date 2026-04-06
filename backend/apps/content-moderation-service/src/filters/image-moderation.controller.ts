import { Controller, Post, UploadedFile, UseInterceptors, BadRequestException, UseGuards } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ImageModerationService } from './image-moderation.service';
import { diskStorage } from 'multer';
import * as path from 'path';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

@Controller('moderate-image')
@UseGuards(JwtAuthGuard)
export class ImageModerationController {
  constructor(private readonly imageModerationService: ImageModerationService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: './uploads',
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
      },
    }),
  }))
  async moderate(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    const result = await this.imageModerationService.moderateImage(file.path);
    // Optionally, delete the file after moderation
    // fs.unlinkSync(file.path);
    return result;
  }
}
