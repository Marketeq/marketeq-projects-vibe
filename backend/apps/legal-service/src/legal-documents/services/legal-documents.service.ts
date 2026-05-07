import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { LegalDocumentRecord } from '../entities/legal-document-record.entity';
import { NdaGenerationService } from '../../nda/services/nda-generation.service';
import { ListLegalDocumentsQueryDto } from '../dto/list-legal-documents-query.dto';

interface PaginatedResult {
  data: Record<string, unknown>[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

@Injectable()
export class LegalDocumentsService {
  constructor(
    @InjectRepository(LegalDocumentRecord)
    private readonly legalDocRepo: Repository<LegalDocumentRecord>,
    private readonly generationService: NdaGenerationService,
  ) {}

  /**
   * Return a paginated list of the caller's signed legal documents.
   * Optionally filter by documentType.
   * Each record includes a fresh presigned download URL.
   */
  async findAll(
    userId: string,
    query: ListLegalDocumentsQueryDto,
  ): Promise<PaginatedResult> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const qb = this.legalDocRepo
      .createQueryBuilder('rec')
      .where('rec.userId = :userId', { userId })
      .orderBy('rec.signedAt', 'DESC')
      .skip(skip)
      .take(limit);

    if (query.type) {
      qb.andWhere('rec.documentType = :type', { type: query.type });
    }

    const [records, total] = await qb.getManyAndCount();

    const data = await Promise.all(
      records.map(async (rec) => ({
        id: rec.id,
        documentType: rec.documentType,
        relatedTitle: rec.relatedTitle,
        version: rec.version,
        signingMethod: rec.signingMethod,
        signedAt: rec.signedAt,
        downloadUrl: rec.signedPdfR2Key
          ? await this.generationService.getPresignedUrl(rec.signedPdfR2Key)
          : null,
      })),
    );

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Return a single document record with a fresh presigned download URL.
   * Throws 403 if the record does not belong to the requesting user.
   */
  async findOne(
    userId: string,
    id: string,
  ): Promise<Record<string, unknown>> {
    const rec = await this.legalDocRepo.findOne({ where: { id } });
    if (!rec) throw new NotFoundException('Legal document record not found');
    if (rec.userId !== userId) {
      throw new ForbiddenException(
        'You do not have access to this document record',
      );
    }

    const downloadUrl = rec.signedPdfR2Key
      ? await this.generationService.getPresignedUrl(rec.signedPdfR2Key)
      : null;

    return {
      id: rec.id,
      documentType: rec.documentType,
      relatedTitle: rec.relatedTitle,
      version: rec.version,
      signingMethod: rec.signingMethod,
      signedAt: rec.signedAt,
      downloadUrl,
    };
  }
}
