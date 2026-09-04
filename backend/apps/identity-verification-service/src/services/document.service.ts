import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IdentityDocument } from '../entities/identity-document.entity';
import { IdentityVerificationProfile } from '../entities/identity-verification-profile.entity';
import { SubmitDocumentDto, DocumentResponseDto, DocumentHistoryResponseDto } from '../dto/document.dto';
import { LocationService } from './location.service';
import { DocumentValidatorService } from './document-validator.service';
import { DiditService } from './didit.service';

@Injectable()
export class DocumentService {
  constructor(
    @InjectRepository(IdentityDocument)
    private documentRepository: Repository<IdentityDocument>,
    @InjectRepository(IdentityVerificationProfile)
    private profileRepository: Repository<IdentityVerificationProfile>,
    private locationService: LocationService,
    private validator: DocumentValidatorService,
    private diditService: DiditService,
  ) {}

  async submitDocument(userId: string, dto: SubmitDocumentDto): Promise<DocumentResponseDto> {
    const profile = await this.locationService.getOrCreateProfile(userId);

    // Validate document data
    this.validator.validateDocumentData(
      dto.documentType,
      dto.issuingCountry,
      dto.documentNumber,
      dto.expirationDate,
      dto.issuingState,
    );

    // Validate with vendor (Didit)
    await this.diditService.validateDocumentWithVendor(
      dto.documentNumber,
      dto.documentType,
      dto.issuingCountry,
    );

    const documentNumberNormalized = this.validator.normalizeDocumentNumber(dto.documentNumber);

    const existingDocument = await this.documentRepository.findOne({
      where: {
        documentNumberNormalized,
        issuingCountry: dto.issuingCountry,
        documentType: dto.documentType,
      },
    });

    if (existingDocument && existingDocument.profileId !== profile.id) {
      const document = this.documentRepository.create({
        profileId: profile.id,
        documentType: dto.documentType,
        issuingCountry: dto.issuingCountry,
        documentNumber: dto.documentNumber,
        documentNumberNormalized,
        expirationDate: dto.expirationDate,
        issuingState: dto.issuingState || null,
        captureMethod: dto.captureMethod,
        documentImageReference: dto.documentImageReference,
        isDuplicateMatch: true,
        duplicateOfDocumentId: existingDocument.id,
      });

      await this.documentRepository.save(document);
      return this.mapToResponse(document);
    }

    const document = this.documentRepository.create({
      profileId: profile.id,
      documentType: dto.documentType,
      issuingCountry: dto.issuingCountry,
      documentNumber: dto.documentNumber,
      documentNumberNormalized,
      expirationDate: dto.expirationDate,
      issuingState: dto.issuingState || null,
      captureMethod: dto.captureMethod,
      documentImageReference: dto.documentImageReference,
    });

    await this.documentRepository.save(document);

    return this.mapToResponse(document);
  }

  async getDocumentHistory(userId: string): Promise<DocumentHistoryResponseDto> {
    const profile = await this.profileRepository.findOne({ where: { userId } });

    if (!profile) {
      throw new NotFoundException(`Profile not found for user ${userId}`);
    }

    const documents = await this.documentRepository.find({
      where: { profileId: profile.id },
      order: { createdAt: 'DESC' },
    });

    return {
      documents: documents.map((doc) => this.mapToResponse(doc)),
      totalCount: documents.length,
      pendingCount: documents.filter((d) => !d.verificationDepth && !d.isDuplicateMatch).length,
      verifiedCount: documents.filter((d) => d.verificationDepth).length,
      rejectedCount: documents.filter((d) => d.isDuplicateMatch).length,
    };
  }

  async getDocument(documentId: string): Promise<IdentityDocument> {
    const document = await this.documentRepository.findOne({ where: { id: documentId } });

    if (!document) {
      throw new NotFoundException(`Document ${documentId} not found`);
    }

    return document;
  }

  async updateDocumentVerificationDepth(
    documentId: string,
    verificationDepth: string,
  ): Promise<DocumentResponseDto> {
    const document = await this.getDocument(documentId);

    document.verificationDepth = verificationDepth as any;
    await this.documentRepository.save(document);

    return this.mapToResponse(document);
  }

  async deleteDocument(documentId: string): Promise<{ success: boolean; message: string }> {
    const document = await this.getDocument(documentId);

    await this.documentRepository.remove(document);

    return {
      success: true,
      message: `Document ${documentId} deleted successfully`,
    };
  }

  private mapToResponse(document: IdentityDocument): DocumentResponseDto {
    return {
      id: document.id,
      profileId: document.profileId,
      documentType: document.documentType,
      issuingCountry: document.issuingCountry,
      documentNumber: document.documentNumber,
      expirationDate: document.expirationDate,
      issuingState: document.issuingState,
      captureMethod: document.captureMethod,
      verificationDepth: document.verificationDepth,
      isDuplicateMatch: document.isDuplicateMatch,
      createdAt: document.createdAt,
    };
  }
}
