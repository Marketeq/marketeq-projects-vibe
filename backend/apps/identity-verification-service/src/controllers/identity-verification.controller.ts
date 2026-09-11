import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';
import { IdentityVerificationService } from '../services/identity-verification.service';
import { BearerAuthGuard } from '../common/guards/bearer-auth.guard';
import { TravelClassificationRequestDto } from '../dto/request/travel-classification.request.dto';
import { TravelDurationRequestDto } from '../dto/request/travel-duration.request.dto';
import { DocumentUploadUrlRequestDto } from '../dto/request/document-upload-url.request.dto';
import { SubmitDocumentRequestDto } from '../dto/request/submit-document.request.dto';
import { ProfileStatusResponseDto } from '../dto/response/profile-status.response.dto';
import { DocumentResponseDto } from '../dto/response/document.response.dto';
import { DocumentUploadUrlResponseDto } from '../dto/response/document-upload-url.response.dto';
import { VerificationSessionResponseDto } from '../dto/response/verification-session.response.dto';

interface AuthenticatedRequest extends Request {
  userId: string;
}

@Controller('v1/identity-verification')
@UseGuards(BearerAuthGuard)
export class IdentityVerificationController {
  constructor(private readonly service: IdentityVerificationService) {}

  @Get('me')
  async getMyStatus(@Req() req: AuthenticatedRequest): Promise<ProfileStatusResponseDto> {
    const profile = await this.service.getOrCreateProfile(req.userId);
    return ProfileStatusResponseDto.fromEntity(profile);
  }

  @Post('home-country/confirm')
  @HttpCode(HttpStatus.OK)
  async confirmHomeCountry(@Req() req: AuthenticatedRequest): Promise<ProfileStatusResponseDto> {
    const profile = await this.service.confirmHomeCountry(req.userId);
    return ProfileStatusResponseDto.fromEntity(profile);
  }

  @Post('travel-classification')
  @HttpCode(HttpStatus.OK)
  async recordTravelClassification(
    @Req() req: AuthenticatedRequest,
    @Body() dto: TravelClassificationRequestDto,
  ): Promise<ProfileStatusResponseDto> {
    const profile = await this.service.recordTravelClassification(req.userId, dto.classification);
    return ProfileStatusResponseDto.fromEntity(profile);
  }

  @Post('travel-duration')
  @HttpCode(HttpStatus.OK)
  async recordTravelDuration(
    @Req() req: AuthenticatedRequest,
    @Body() dto: TravelDurationRequestDto,
  ): Promise<ProfileStatusResponseDto> {
    const profile = await this.service.recordTravelDuration(req.userId, dto.duration);
    return ProfileStatusResponseDto.fromEntity(profile);
  }

  @Post('documents/upload-url')
  async createDocumentUploadUrl(
    @Req() req: AuthenticatedRequest,
    @Body() dto: DocumentUploadUrlRequestDto,
  ): Promise<DocumentUploadUrlResponseDto> {
    return this.service.createDocumentUploadUrl(req.userId, dto.fileExtension);
  }

  @Post('documents')
  async submitDocument(
    @Req() req: AuthenticatedRequest,
    @Body() dto: SubmitDocumentRequestDto,
  ): Promise<DocumentResponseDto> {
    const document = await this.service.submitDocument(req.userId, dto);
    return DocumentResponseDto.fromEntity(document);
  }

  @Post('documents/:documentId/verify')
  async startVerificationSession(
    @Req() req: AuthenticatedRequest,
    @Param('documentId') documentId: string,
  ): Promise<VerificationSessionResponseDto> {
    return this.service.startVerificationSession(req.userId, documentId);
  }

  @Get('documents')
  async listDocuments(@Req() req: AuthenticatedRequest): Promise<DocumentResponseDto[]> {
    const documents = await this.service.listDocuments(req.userId);
    return documents.map((d) => DocumentResponseDto.fromEntity(d));
  }
}
