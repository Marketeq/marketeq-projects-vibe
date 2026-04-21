import {
  Injectable,
  Logger,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import sanitizeHtml from 'sanitize-html';
import { JobListing } from '../entities/job-listing.entity';
import { TeamMemberRow } from '../entities/job-listing-role-row.entity';
import { BasicInformation } from '../entities/job-listing-basic-info.entity';
import { JobListingStatus } from '../enums/job-listing-status.enum';
import { ContractType } from '../enums/contract-type.enum';
import { PresignBriefUploadDto } from '../dto/presign-brief-upload.dto';
import { CreateJobListingDto } from '../dto/create-job-listing.dto';
import { UpdateJobListingDto } from '../dto/update-job-listing.dto';
import { UpdateBasicInformationDto } from '../dto/update-basic-info.dto';
import { SendInvitesDto } from '../dto/send-invites.dto';
import { ListJobListingsQueryDto } from '../dto/list-job-listings-query.dto';
import { CreateRoleRowDto } from '../dto/create-role-row.dto';
import { JobListingInviteService } from './job-listing-invite.service';
import { createR2Client } from '../config/r2.config';

// ── Rich text helpers (exported so publish service can reuse wordCount) ───────

export function sanitiseRichText(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: ['h2', 'h3', 'h4', 'p', 'ul', 'ol', 'li'],
    allowedAttributes: {},
  });
}

export function plainTextFromHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

export function wordCount(html: string): number {
  const plain = plainTextFromHtml(html);
  return plain.split(/\s+/).filter((w) => w.length > 0).length;
}

@Injectable()
export class JobListingService {
  private readonly logger = new Logger(JobListingService.name);
  private readonly r2Client: S3Client;

  constructor(
    @InjectRepository(JobListing)
    private readonly repo: Repository<JobListing>,
    @InjectRepository(TeamMemberRow)
    private readonly roleRowRepo: Repository<TeamMemberRow>,
    @InjectRepository(BasicInformation)
    private readonly basicInfoRepo: Repository<BasicInformation>,
    private readonly config: ConfigService,
    private readonly http: HttpService,
    private readonly inviteService: JobListingInviteService,
  ) {
    this.r2Client = createR2Client(config);
  }

  // Called during create() when contractType is EXISTING.
  // Validates the selected contract is in a selectable status and the user
  // has owner or lead permission on it. Throws 409 or 403 otherwise.
  async validateContractSelectable(contractId: string, userId: string): Promise<void> {
    const url = `${this.config.get('CONTRACTS_SERVICE_URL')}/v1/contracts/${contractId}`;
    const response = await firstValueFrom(
      this.http.get(url, { headers: { 'x-user-id': userId } }),
    );
    const contract = response.data;

    const SELECTABLE_STATUSES = ['active', 'paused'];
    if (!SELECTABLE_STATUSES.includes(contract.status)) {
      const reason = {
        disputed: 'Contract is under dispute.',
        expired:  'Contract has expired.',
        closed:   'Contract is closed.',
      }[contract.status as string] ?? 'Contract is not available for new job listings.';

      throw new ConflictException({ code: 'JL_CONTRACT_NOT_SELECTABLE', message: reason });
    }

    const hasPermission = contract.members?.some(
      (m: { userId: string; role: string }) =>
        m.userId === userId && ['owner', 'lead'].includes(m.role),
    );
    if (!hasPermission) {
      throw new ForbiddenException({
        code:    'JL_CONTRACT_FORBIDDEN',
        message: 'You do not have permission to add job listings to this contract.',
      });
    }
  }

  async setStatus(
    listingId: string,
    status: JobListingStatus,
    extra?: Partial<JobListing>,
  ): Promise<void> {
    const update: Partial<JobListing> = { status, ...extra };

    // Record publishedAt on first transition to published (moderation approval).
    if (status === JobListingStatus.PUBLISHED) {
      const listing = await this.repo.findOne({ where: { id: listingId } });
      if (listing && !listing.publishedAt) {
        update.publishedAt = new Date();
      }
    }

    await this.repo.update(listingId, update as any);
  }

  // Returns a fully-loaded listing with all relations needed by AlgoliaService.
  async findOneInternal(listingId: string): Promise<JobListing> {
    return (await this.repo.findOne({
      where: { id: listingId },
      relations: [
        'basicInformation',
        'roleDescriptions',
        'teamMemberRows',
        'phases',
        'phases.tasks',
      ],
    }))!;
  }

  async linkContract(_listingId: string, _contractId: string): Promise<void> {
    // TODO: implement in service document
  }

  // Called when contractType is EXISTING during create().
  // Fetches the parent contract from contracts-service and copies
  // budget, duration, NDA, and contract link onto the listing record.
  async populateFromContract(listingId: string, contractId: string): Promise<void> {
    const url = `${this.config.get('CONTRACTS_SERVICE_URL')}/v1/contracts/${contractId}`;
    const response = await firstValueFrom(this.http.get(url));
    const contract = response.data;

    await this.repo.update(listingId, {
      contractId,
      budgetAmountUsdCents: contract.budgetAmountUsdCents,
      budgetFrequency:      contract.budgetFrequency,
      durationMonths:       contract.durationMonths,
      isOngoing:            contract.isOngoing,
      ndaEnabled:           contract.ndaEnabled,
      ndaDocumentId:        contract.ndaDocumentId ?? null,
      ndaScopeVisibility:   contract.ndaScopeVisibility,
      inviteBalance:        0, // Calculated properly on publish.
    });
  }

  async create(userId: string, dto: CreateJobListingDto): Promise<JobListing> {
    if (dto.contractType === ContractType.EXISTING && dto.contractId) {
      await this.validateContractSelectable(dto.contractId, userId);
    }

    const listing = this.repo.create({
      clientUserId:   userId,
      contractType:   dto.contractType,
      scopeKnowledge: dto.scopeKnowledge ?? null,
      workType:       dto.workType       ?? null,
      hiringType:     dto.hiringType     ?? null,
      status:         JobListingStatus.DRAFT,
      lastActivityAt: new Date(),
    });

    const saved = await this.repo.save(listing);

    if (dto.contractType === ContractType.EXISTING && dto.contractId) {
      await this.populateFromContract(saved.id, dto.contractId);
    }

    this.logger.log(`Job listing created: ${saved.id}`);
    return (await this.repo.findOne({ where: { id: saved.id } }))!;
  }

  async findAll(userId: string, query: ListJobListingsQueryDto): Promise<JobListing[]> {
    const where: Record<string, unknown> = { clientUserId: userId };
    if (query.status) where.status      = query.status;
    if (query.type)   where.listingType = query.type;

    const page  = query.page  ?? 1;
    const limit = query.limit ?? 20;

    return this.repo.find({
      where: where as any,
      order: { createdAt: 'DESC' },
      skip:  (page - 1) * limit,
      take:  limit,
    });
  }

  async findOne(_userId: string, listingId: string): Promise<JobListing> {
    const listing = await this.repo.findOne({
      where: { id: listingId },
      relations: ['basicInformation', 'roleDescriptions', 'teamMemberRows', 'phases', 'phases.tasks'],
    });

    if (!listing) {
      throw new NotFoundException({ code: 'JL_NOT_FOUND', message: 'Job listing not found.' });
    }

    return listing;
  }

  async update(
    _userId: string,
    listingId: string,
    dto: UpdateJobListingDto,
  ): Promise<JobListing> {
    const fields: Partial<JobListing> = {};

    if (dto.scopeKnowledge     !== undefined) fields.scopeKnowledge     = dto.scopeKnowledge;
    if (dto.workType           !== undefined) fields.workType           = dto.workType;
    if (dto.hiringType         !== undefined) fields.hiringType         = dto.hiringType;
    if (dto.description        !== undefined) fields.description        = dto.description;
    if (dto.deliverables       !== undefined) fields.deliverables       = dto.deliverables;
    if (dto.successCriteria    !== undefined) fields.successCriteria    = dto.successCriteria;
    if (dto.headcount          !== undefined) fields.headcount          = dto.headcount;
    if (dto.budgetFrequency    !== undefined) fields.budgetFrequency    = dto.budgetFrequency;
    if (dto.durationMonths     !== undefined) fields.durationMonths     = dto.durationMonths;
    if (dto.isOngoing          !== undefined) fields.isOngoing          = dto.isOngoing;
    if (dto.ndaEnabled         !== undefined) fields.ndaEnabled         = dto.ndaEnabled;
    if (dto.ndaScopeVisibility !== undefined) fields.ndaScopeVisibility = dto.ndaScopeVisibility;

    if (dto.budgetAmount !== undefined) {
      fields.budgetAmountUsdCents = await this.convertToUsdCents(dto.budgetAmount, dto.budgetDisplayCurrency);
    }

    fields.lastActivityAt   = new Date();
    fields.staleWarningSent = false;

    await this.repo.update(listingId, fields as any);

    return (await this.repo.findOne({
      where: { id: listingId },
      relations: ['basicInformation', 'roleDescriptions', 'teamMemberRows', 'phases', 'phases.tasks'],
    }))!;
  }

  async updateBasicInformation(
    listingId: string,
    dto: UpdateBasicInformationDto,
  ): Promise<BasicInformation> {
    const normalizedTitle =
      typeof dto.title === 'string' ? dto.title.trim() : undefined;
    const normalizedJobType =
      dto.jobType === null
        ? null
        : typeof dto.jobType === 'string'
          ? dto.jobType.trim()
          : undefined;

    const listing = await this.repo.findOne({
      where: { id: listingId },
      select: ['id'],
    });

    if (!listing) {
      throw new NotFoundException({ code: 'JL_NOT_FOUND', message: 'Job listing not found.' });
    }

    let basicInfo = await this.basicInfoRepo.findOne({
      where: { jobListingId: listingId },
    });

    if (!basicInfo) {
      basicInfo = this.basicInfoRepo.create({
        jobListingId: listingId,
        title: normalizedTitle ?? '',
        jobType: normalizedJobType ?? null,
        industries: dto.industries ?? [],
        languages: dto.languages ?? [],
      });
    } else {
      if (normalizedTitle !== undefined) basicInfo.title = normalizedTitle;
      if (normalizedJobType !== undefined) basicInfo.jobType = normalizedJobType;
      if (dto.industries !== undefined) basicInfo.industries = dto.industries;
      if (dto.languages !== undefined) basicInfo.languages = dto.languages;
    }

    return this.basicInfoRepo.save(basicInfo);
  }

  async softDelete(listingId: string): Promise<void> {
    await this.repo.update(listingId, {
      status:   JobListingStatus.CLOSED,
      closedAt: new Date(),
    });
  }

  async duplicateRole(listingId: string, roleRowId: string): Promise<void> {
    const row = await this.roleRowRepo.findOne({
      where: { id: roleRowId, jobListingId: listingId },
    });

    if (!row) {
      throw new NotFoundException({ code: 'JL_ROLE_NOT_FOUND', message: 'Role row not found.' });
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id: _id, createdAt: _c, updatedAt: _u, ...rest } = row;
    const duplicate = this.roleRowRepo.create({
      ...rest,
      positionOrder:           row.positionOrder + 1,
      assignedUserId:          null,
      assignedUsername:        null,
      assignedUserDeactivated: false,
    });

    await this.roleRowRepo.save(duplicate);
  }

  async createRoleRow(
    listingId: string,
    dto: CreateRoleRowDto,
  ): Promise<TeamMemberRow> {
    const roleTitle = dto.role?.trim();
    if (!roleTitle) {
      throw new BadRequestException({
        code: 'JL_ROLE_TITLE_REQUIRED',
        message: 'Role title is required.',
      });
    }

    let positionOrder = dto.positionOrder;
    if (positionOrder === undefined) {
      const maxResult = await this.roleRowRepo
        .createQueryBuilder('row')
        .select('COALESCE(MAX(row.positionOrder), -1)', 'maxOrder')
        .where('row.jobListingId = :listingId', { listingId })
        .getRawOne<{ maxOrder: string | number }>();

      positionOrder = Number(maxResult?.maxOrder ?? -1) + 1;
    }

    const roleRow = this.roleRowRepo.create({
      jobListingId: listingId,
      roleTitle,
      positionOrder,
      assignedUserId: dto.assignedUserId ?? null,
      assignedUsername: null,
      assignedUserDeactivated: false,
      location: null,
      experienceLevel: null,
      customHours: null,
      customFrequency: null,
      contractLengthMonths: null,
      hourlyRateLowUsdCents: null,
      hourlyRateHighUsdCents: null,
    });

    return this.roleRowRepo.save(roleRow);
  }

  async sendInvites(listingId: string, dto: SendInvitesDto): Promise<void> {
    return this.inviteService.send(listingId, dto);
  }

  // Converts a budget amount in the client's display currency to USD cents.
  // Falls back to treating the amount as USD when the FX endpoint is unavailable.
  private async convertToUsdCents(amount: number, currency?: string): Promise<number> {
    if (!currency || currency.toUpperCase() === 'USD') {
      return Math.round(amount * 100);
    }
    try {
      const response = await firstValueFrom(
        this.http.get(`${this.config.get('PRICING_SERVICE_URL')}/v1/fx`, {
          params: { from: currency, to: 'USD', amount },
        }),
      );
      return Math.round(response.data.convertedAmountUsd * 100);
    } catch {
      this.logger.warn(`FX conversion unavailable for ${currency}, treating amount as USD`);
      return Math.round(amount * 100);
    }
  }

  async presignBriefUpload(
    listingId: string,
    dto: PresignBriefUploadDto,
  ): Promise<{ presignedUrl: string; key: string; expiresAt: string }> {
    const sanitisedFilename = dto.filename
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .substring(0, 200);

    const key = `briefs/${listingId}/${uuidv4()}/${sanitisedFilename}`;

    const command = new PutObjectCommand({
      Bucket: this.config.get('CLOUDFLARE_R2_BUCKET'),
      Key: key,
      ContentType: dto.contentType,
      ContentLength: dto.sizeBytes,
    });

    const presignedUrl = await getSignedUrl(this.r2Client, command, {
      expiresIn: 300, // 5 minutes
    });

    const expiresAt = new Date(Date.now() + 300_000).toISOString();

    // jl_brief_presign_rejected is not logged here — contentType and sizeBytes are
    // validated by class-validator at the DTO level (presign-brief-upload.dto.ts).
    // Invalid requests are rejected before reaching this service method.
    // If rejection logging is needed, add it to a validation exception filter.
    this.logger.log(`jl_brief_presign_issued listingId=${listingId}`);
    return { presignedUrl, key, expiresAt };
  }
}
