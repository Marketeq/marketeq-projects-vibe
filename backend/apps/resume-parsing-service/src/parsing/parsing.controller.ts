import {
  Controller,
  Post,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Req,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ServiceAuthGuard } from '../common/guards/service-auth.guard';
import { CorrelationInterceptor } from '../common/interceptors/correlation.interceptor';
import { DeadlineInterceptor } from '../common/interceptors/deadline.interceptor';
import { FileValidator } from '../common/validation/file.validator';
import { ParsingService } from './parsing.service';
import { ParseException } from '../common/errors/parse.exception';

@Controller('v1')
@UseGuards(ServiceAuthGuard)
@UseInterceptors(CorrelationInterceptor, DeadlineInterceptor)
export class ParsingController {
  private readonly logger = new Logger(ParsingController.name);

  constructor(
    private readonly parsingService: ParsingService,
    private readonly fileValidator: FileValidator,
  ) {}

  @Post('parse')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 6 * 1024 * 1024 }, // slightly above 5MB to let our validator handle the message
    }),
  )
  async parse(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any,
  ) {
    if (!file) {
      throw ParseException.missingFile();
    }

    // Validate file type, size, and signature
    const validatedMime = this.fileValidator.validate(
      file.buffer,
      file.mimetype,
      file.originalname,
    );

    this.logger.log({
      msg: 'Parse request received',
      correlationId: req.correlationId,
      mimeType: validatedMime,
      sizeBytes: file.buffer.length,
    });

    return this.parsingService.parse(
      file.buffer,
      validatedMime,
      req.correlationId,
      req.idempotencyKey,
    );
  }
}
