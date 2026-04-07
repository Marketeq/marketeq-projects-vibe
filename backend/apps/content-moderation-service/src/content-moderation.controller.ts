import { BadRequestException, Get, HttpCode, HttpStatus, UnprocessableEntityException, UseGuards } from '@nestjs/common';
import { Controller, Post, Body, Param, UploadedFile, UseInterceptors, Req } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { ContentValidationService } from './filters/content-validation.service';
import { MediaModerationService } from './filters/media-moderation.service';
import { ContentModerationService } from './filters/content-moderation.service';
import { BannedKeywordsService } from './filters/banned-keywords.service';
import { FileValidationService } from './filters/file-validation.service';
import { ProfanityFilterService } from './filters/profanity-filter.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AdminGuard } from './guards/admin.guard';
import { Request } from 'express';
import { Logger } from '@nestjs/common';
import { promises as fsPromises } from 'fs';
import * as os from 'os';
import * as path from 'path';

@Controller('api/moderate')
@UseGuards(JwtAuthGuard)
export class ContentModerationController {
  private readonly logger = new Logger(ContentModerationController.name);

  constructor(
    private readonly contentValidationService: ContentValidationService,
    private readonly mediaModerationService: MediaModerationService,
    private readonly contentModerationService: ContentModerationService,
    private readonly bannedKeywordsService: BannedKeywordsService,
    private readonly fileValidationService: FileValidationService,
    private readonly profanityFilterService: ProfanityFilterService,
  ) {}

  @Post('content')
  async moderateContent(@Body() contentDto: { contentId: string; content: string; title: string; category: string; subcategory: string; tags?: string[]; categories?: string[] }): Promise<any> {
    const { contentId, content, title, category, subcategory } = contentDto;
    const combinedTextForKeywordChecks = [title, content]
      .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
      .join('\\n');

    // 1️⃣ Banned Keywords Check
    const bannedKeywordResult = await this.bannedKeywordsService.check(combinedTextForKeywordChecks);
    if (bannedKeywordResult.failed) {
      const reason = 'Content violates moderation policy: bad words detected';
      await this.contentModerationService.rejectContent(contentId, reason);
      return { status: 'rejected', reason, contentId };
    }

    // 2️⃣ Profanity Filter Check
    const profanityResult = await this.profanityFilterService.check(combinedTextForKeywordChecks);
    if (profanityResult.failed) {
      const reason = 'Content violates moderation policy: profanity detected';
      await this.contentModerationService.rejectContent(contentId, reason);
      return { status: 'rejected', reason, contentId };
    }

    // 3️⃣ Field-level Validation (Test Cases 11–13)
    try {
      this.contentValidationService.validateProjectFields({
        title,
        description: content,
        tags: contentDto.tags ?? [],
        categories: contentDto.categories ?? []
      });
    } catch (error) {
      await this.contentModerationService.rejectContent(contentId, error.message);
      return { status: 'rejected', reason: error.message, contentId };
    }

  /*  // 4️⃣ Category Validation
    const validCategories = ['Design', 'Development', 'Marketing'];
    if (!validCategories.includes(category)) {
      await this.contentModerationService.rejectContent(contentId, 'Invalid category');
      return { status: 'rejected', reason: 'Invalid category', contentId };
    }

    // 5️⃣ Subcategory Validation (SKIPPED if category is not recognized)
    const subcategories = {
      'Design': ['UI/UX', 'Graphic Design'],
      'Development': ['Frontend', 'Backend'],
      'Marketing': ['SEO', 'Content Marketing'],
    };
    if (subcategories[category] && !subcategories[category].includes(subcategory)) {
      await this.contentModerationService.rejectContent(contentId, 'Invalid subcategory');
      return { status: 'rejected', reason: 'Invalid subcategory' };
    }
*/
    // 6️⃣ Further Content Validation
    const isContentValid = await this.contentValidationService.validateContent(content);
    if (!isContentValid) {
      const reason = 'Content violates moderation policy: content failed validation';
      await this.contentModerationService.rejectContent(contentId, reason);
      return { status: 'rejected', reason };
    }

    // 7️⃣ Approve Content if All Checks Pass
    await this.contentModerationService.approveContent(contentId, 'Content passes all checks');
    return { status: 'approved',contentId, reason: 'Content passes validation' };
  }

  @Post('media')
  async moderateMedia(
    @Body() mediaDto: { contentId: string; mediaType: string; mediaUrl: string },
  ): Promise<any> {
    const { contentId, mediaType, mediaUrl } = mediaDto;

    let result: {
      isSafe: boolean;
      status: string;
      reason?: string;
      debug?: {
        step: string;
        rejectCode?: string;
        detail?: string;
        httpStatus?: number;
        source: 'remote_url' | 'local_file';
      };
    };

    if (mediaType === 'image') {
      result = await this.mediaModerationService.moderateImage(mediaUrl);
    } else if (mediaType === 'video') {
      result = await this.mediaModerationService.moderateVideo(mediaUrl);
    } else {
      await this.contentModerationService.rejectContent(contentId, 'Unsupported media type');
      return { status: 'rejected', reason: 'Unsupported media type' };
    }

    const { isSafe, status, reason } = result;
    const message = await this.mediaModerationService.getMediaStatusMessage(mediaUrl, status);
    const resolvedReason = reason || message;
    this.logger.log(
      `[media-moderation] contentId=${contentId} status=${status} isSafe=${isSafe} reason="${resolvedReason}" debug=${JSON.stringify(
        result.debug ?? {},
      )}`,
    );

    if (!isSafe) {
      await this.contentModerationService.rejectContent(contentId, resolvedReason);
      return {
        status: 'rejected',
        reason: resolvedReason,
        message,
        debug: result.debug,
      };
    }

    if (status === 'pending_review') {
      await this.contentModerationService.flagContent(contentId, resolvedReason);
      return {
        status: 'pending_review',
        reason: resolvedReason,
        message,
        debug: result.debug,
      };
    }

    await this.contentModerationService.approveContent(contentId, resolvedReason);
    return {
      status: 'approved',
      reason: resolvedReason,
      message,
      debug: result.debug,
    };
  }

  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 10 * 1024 * 1024 },
      storage: diskStorage({
        destination: os.tmpdir(),
        filename: (req, file, cb) => {
          const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
          cb(null, `${uniqueSuffix}${path.extname(file.originalname)}`);
        },
      }),
    }),
  )
  @Post('upload')
  @HttpCode(HttpStatus.OK)
  async moderateFile(
    @UploadedFile() file: Express.Multer.File,
    @Body('contentId') contentId: string,
    @Req() req: Request
  ): Promise<{
    status: 'error' | 'rejected' | 'approved' | 'pending_review';
    reason: string;
    contentId?: string;
    contentType?: string;
  }> {
    // Minimal diagnostic log — no headers, no body, no file contents.
    this.logger.log(
      `moderateFile ${req.method} ${req.url} content-length=${req.headers['content-length'] ?? 'n/a'}`,
    );

    const contentType = req.headers['content-type'] || '';
    
    // Validate content-type
    if (!contentType.includes('multipart/form-data')) {
      throw new BadRequestException({
        status: 'error',
        reason: 'Content-Type must be multipart/form-data for file upload',
        contentType,
      });
    }
    
    // Validate file presence
    if (!file) {
      throw new BadRequestException({
        status: 'error',
        reason: 'No file uploaded',
        contentId,
      });
    }
    
    // Validate contentId presence
    if (!contentId) {
      throw new BadRequestException({
        status: 'error',
        reason: 'No contentId provided',
      });
    }
    
    try {
      // Validate file content
      const result = await this.fileValidationService.validateFile(file);

      if (!result.valid) {
        await this.contentModerationService.rejectContent(contentId, result.reason ?? 'File validation failed');
        throw new UnprocessableEntityException({
          status: 'rejected',
          reason: result.reason,
          contentId,
        });
      }

      const mediaType = file.mimetype.startsWith('image/')
        ? 'image'
        : file.mimetype.startsWith('video/')
          ? 'video'
          : null;

      if (!mediaType) {
        await this.contentModerationService.rejectContent(contentId, 'Unsupported media type');
        throw new UnprocessableEntityException({
          status: 'rejected',
          reason: 'Unsupported media type',
          contentId,
        });
      }

      const moderationResult = mediaType === 'image'
        ? await this.mediaModerationService.moderateImage(file.path)
        : await this.mediaModerationService.moderateVideo(file.path);

      const message = await this.mediaModerationService.getMediaStatusMessage(
        file.originalname,
        moderationResult.status,
      );
      const resolvedReason = moderationResult.reason || message;

      if (!moderationResult.isSafe) {
        await this.contentModerationService.rejectContent(contentId, resolvedReason);
        throw new UnprocessableEntityException({
          status: 'rejected',
          reason: resolvedReason,
          contentId,
          contentType,
        });
      }

      if (moderationResult.status === 'pending_review') {
        await this.contentModerationService.flagContent(contentId, resolvedReason);
        return {
          status: 'pending_review',
          reason: resolvedReason,
          contentId,
          contentType,
        };
      }

      await this.contentModerationService.approveContent(contentId, resolvedReason);
      return {
        status: 'approved',
        reason: resolvedReason,
        contentId,
        contentType,
      };
    } finally {
      if (file?.path) {
        try {
          await fsPromises.unlink(file.path);
        } catch {
          this.logger.warn(`Failed to remove temp file: ${file.path}`);
        }
      }
    }
  }

  @Post('content/:id/approve')
  async approveContent(@Param('id') contentId: string, @Body() body: { reason?: string }) {
    await this.contentModerationService.approveContent(contentId, body?.reason);
    return {
      status: 'approved',
      contentId,
      reason: body?.reason || 'Content has been approved',
    };
  }

  // TODO(prod): back banned keywords with a DB table; currently per-instance ephemeral.
  @Post('admin/keywords')
  @UseGuards(AdminGuard)
  async addBannedKeyword(@Body() body: { newKeyword?: string; keywords?: string[] }) {
    const keywords = Array.isArray(body.keywords)
      ? body.keywords
      : body.newKeyword ? [body.newKeyword] : [];
    if (!keywords.length) {
      return { status: 'error', message: 'At least one keyword must be provided.' };
    }
    const added: string[] = [];
    const skipped: string[] = [];
    for (const newKeyword of keywords) {
      if (typeof newKeyword !== 'string' || !newKeyword.trim()) {
        skipped.push(newKeyword);
        continue;
      }
      const exists = (await this.bannedKeywordsService.getAll()).some(
        k => k.toLowerCase() === newKeyword.toLowerCase()
      );
      if (exists) {
        skipped.push(newKeyword);
        continue;
      }
      await this.bannedKeywordsService.add(newKeyword);
      added.push(newKeyword);
    }
    return {
      status: 'success',
      added,
      skipped,
      message: `Added: ${added.join(', ')}${skipped.length ? '; Skipped: ' + skipped.join(', ') : ''}`,
    };
  }

  // TODO(prod): profanity sensitivity is per-instance ephemeral; persist to DB.
  @Post('admin/profanity-sensitivity')
  @UseGuards(AdminGuard)
  async setProfanitySensitivity(@Body() body: { sensitivity: string }) {
    this.profanityFilterService.adjustSensitivity(body.sensitivity);
    return { status: 'success', message: `Profanity sensitivity set to '${body.sensitivity}'.` };
  }

  /*  @Get('admin/autocomplete')
  async getAutocompleteSuggestions() {
    // Example: fetch suggestions and banned keywords from services
    const suggestions = await this.autocompleteService?.getSuggestions?.() ?? [];
    const bannedKeywords = await this.bannedKeywordsService?.getAll?.() ?? [];
    return {
      suggestions,
      bannedKeywords,
    };
  }
    */
}




