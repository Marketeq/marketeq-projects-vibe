import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  UploadedFile,
  UseInterceptors,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { CurrentUser } from '../decorators/current-user.decorator';
import { ResumeService } from './resume.service';
import { ApplyResumeDto } from './dto/apply-resume.dto';

@Controller('resume')
export class ResumeController {
  constructor(private readonly resumeService: ResumeService) {}

  private getUserId(user: any): string {
    return user?.userId || user?.sub || user?.id;
  }

  @Post('upload')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  async uploadResume(
    @CurrentUser() user: any,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.resumeService.uploadAndParse(this.getUserId(user), file);
  }

  @Post('apply')
  @HttpCode(HttpStatus.OK)
  async applyResume(
    @CurrentUser() user: any,
    @Body() dto: ApplyResumeDto,
  ) {
    return this.resumeService.applyResumeData(this.getUserId(user), dto);
  }

  @Post('undo/:parseResultId')
  @HttpCode(HttpStatus.OK)
  async undoImport(
    @CurrentUser() user: any,
    @Param('parseResultId') parseResultId: string,
  ) {
    return this.resumeService.undoImport(this.getUserId(user), parseResultId);
  }

  @Get('status')
  async getResumeStatus(@CurrentUser() user: any) {
    return this.resumeService.getResumeStatus(this.getUserId(user));
  }

  @Get('pending-review')
  async getPendingReview(@CurrentUser() user: any) {
    return this.resumeService.getPendingReview(this.getUserId(user));
  }

  @Get('view')
  async viewResume(@CurrentUser() user: any) {
    const url = await this.resumeService.getResumeViewUrl(this.getUserId(user));
    return { url };
  }

  @Get('download')
  async downloadResume(@CurrentUser() user: any) {
    return this.resumeService.getResumeDownloadUrl(this.getUserId(user));
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteResume(@CurrentUser() user: any) {
    return this.resumeService.deleteResume(this.getUserId(user));
  }
}
