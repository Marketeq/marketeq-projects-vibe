import {
    Injectable,
    NotFoundException,
    BadRequestException,
    UnprocessableEntityException,
  } from '@nestjs/common';
  import { InjectRepository } from '@nestjs/typeorm';
  import { Repository } from 'typeorm';
  import { plainToInstance } from 'class-transformer';
  import { EventEmitter2 } from '@nestjs/event-emitter';
  
  import { Transaction } from '../entities/transaction.entity';
  import { TransactionFilterDto } from '../dto/filter.dto';
  import {
    TransactionResponseDto,
    TransactionDetailResponseDto,
    ReportTransactionDto,
  } from '../dto/transaction.dto';
  import { PaginatedResponseDto } from '../dto/pagination.dto';
  import { AuditService } from './audit.service';
  
  @Injectable()
  export class TransactionService {
    constructor(
      @InjectRepository(Transaction)
      private readonly repo: Repository<Transaction>,
      private readonly auditService: AuditService,
      private readonly eventEmitter: EventEmitter2,
    ) {}
  
    async findAll(
      userId: string,
      filters: TransactionFilterDto,
    ): Promise<PaginatedResponseDto<TransactionResponseDto>> {
      // Validate date range cross-field constraints
      if (filters.dateFrom && filters.dateTo) {
        if (new Date(filters.dateFrom) > new Date(filters.dateTo)) {
          throw new BadRequestException({
            code: 'VALIDATION_ERROR',
            message:
              'Your start date cannot be after your end date. Please adjust your selection.',
          });
        }
      }
  
      if (filters.dateFrom && new Date(filters.dateFrom) > new Date()) {
        throw new BadRequestException({
          code: 'VALIDATION_ERROR',
          message: 'Start date cannot be in the future.',
        });
      }
  
      const qb = this.repo
        .createQueryBuilder('t')
        .where('t.user_id = :userId', { userId })
        .orderBy('t.date', 'DESC')
        .addOrderBy('t.created_at', 'DESC');
  
      if (filters.dateFrom) {
        qb.andWhere('t.date >= :dateFrom', { dateFrom: filters.dateFrom });
      }
  
      if (filters.dateTo) {
        qb.andWhere('t.date <= :dateTo', { dateTo: filters.dateTo });
      }
  
      if (filters.type) {
        qb.andWhere('t.description_type = :type', { type: filters.type });
      }
  
      if (filters.contractId) {
        qb.andWhere('t.contract_id = :contractId', {
          contractId: filters.contractId,
        });
      }
  
      if (filters.paymentMethodType) {
        qb.andWhere('t.payment_method_type = :pmt', {
          pmt: filters.paymentMethodType,
        });
      }
  
      if (filters.search) {
        const term = `%${filters.search.toLowerCase()}%`;
        qb.andWhere(
          `(LOWER(t.description_project_name) LIKE :term
            OR LOWER(t.description_contractor_handle) LIKE :term
            OR LOWER(t.invoice_number) LIKE :term
            OR CAST(t.amount AS TEXT) LIKE :term
            OR LOWER(t.transaction_id) LIKE :term)`,
          { term },
        );
      }
  
      const page = filters.page ?? 1;
      const limit = filters.limit ?? 10;
  
      qb.skip((page - 1) * limit).take(limit);
  
      const [items, total] = await qb.getManyAndCount();
  
      const dtos = items.map((item) =>
        plainToInstance(TransactionResponseDto, item, {
          excludeExtraneousValues: true,
        }),
      );
  
      return PaginatedResponseDto.of(dtos, total, page, limit);
    }
  
    async countFiltered(
      userId: string,
      filters: TransactionFilterDto,
    ): Promise<number> {
      const qb = this.repo
        .createQueryBuilder('t')
        .where('t.user_id = :userId', { userId });
  
      if (filters.dateFrom) {
        qb.andWhere('t.date >= :dateFrom', { dateFrom: filters.dateFrom });
      }
      if (filters.dateTo) {
        qb.andWhere('t.date <= :dateTo', { dateTo: filters.dateTo });
      }
      if (filters.type) {
        qb.andWhere('t.description_type = :type', { type: filters.type });
      }
      if (filters.contractId) {
        qb.andWhere('t.contract_id = :contractId', {
          contractId: filters.contractId,
        });
      }
      if (filters.paymentMethodType) {
        qb.andWhere('t.payment_method_type = :pmt', {
          pmt: filters.paymentMethodType,
        });
      }
      if (filters.search) {
        const term = `%${filters.search.toLowerCase()}%`;
        qb.andWhere(
          `(LOWER(t.description_project_name) LIKE :term
            OR LOWER(t.description_contractor_handle) LIKE :term
            OR LOWER(t.invoice_number) LIKE :term
            OR CAST(t.amount AS TEXT) LIKE :term
            OR LOWER(t.transaction_id) LIKE :term)`,
          { term },
        );
      }
  
      return qb.getCount();
    }
  
    async findOne(
      id: string,
      userId: string,
    ): Promise<TransactionDetailResponseDto> {
      const transaction = await this.repo.findOne({
        where: { id, userId },
        relations: ['detail', 'contract'],
      });
  
      if (!transaction) {
        throw new NotFoundException({
          code: 'NOT_FOUND',
          message:
            'We could not load the details for this transaction. Please try again.',
        });
      }
  
      await this.auditService.log({
        action: 'VIEW_TRANSACTION_DETAIL',
        transactionId: id,
        userId,
      });
  
      return plainToInstance(TransactionDetailResponseDto, transaction, {
        excludeExtraneousValues: true,
      });
    }
  
    async getReceipt(
      id: string,
      userId: string,
    ): Promise<{ buffer: Buffer; filename: string }> {
      const transaction = await this.repo.findOne({
        where: { id, userId },
        relations: ['detail'],
      });
  
      if (!transaction) {
        throw new NotFoundException({
          code: 'NOT_FOUND',
          message:
            'We could not load the details for this transaction. Please try again.',
        });
      }
  
      const receiptBlockedStatuses = [
        'processing',
        'pending',
        'payment_pending',
        'scheduled',
      ];
  
      if (receiptBlockedStatuses.includes(transaction.status)) {
        throw new UnprocessableEntityException({
          code: 'BUSINESS_RULE_VIOLATION',
          message: 'Your receipt will be available once this payment is complete.',
        });
      }
  
      const buffer = await this.generateReceiptPdf(transaction);
      const filename = `receipt-${transaction.transactionId}-${transaction.date}.pdf`;
  
      await this.auditService.log({
        action: 'DOWNLOAD_RECEIPT',
        transactionId: id,
        userId,
      });
  
      return { buffer, filename };
    }
  
    async submitReport(
      id: string,
      userId: string,
      dto: ReportTransactionDto,
    ): Promise<{ caseReference: string; message: string }> {
      const transaction = await this.repo.findOne({ where: { id, userId } });
  
      if (!transaction) {
        throw new NotFoundException({
          code: 'NOT_FOUND',
          message:
            'We could not load the details for this transaction. Please try again.',
        });
      }
  
      // Generate a case reference from transaction ID + timestamp
      const caseReference = `CASE-${transaction.transactionId}-${Date.now()}`;
  
      // Publish event for ticketing system integration
      this.eventEmitter.emit('transaction.report.submitted', {
        caseReference,
        transactionId: id,
        userId,
        category: dto.category,
        description: dto.description,
      });
  
      await this.auditService.log({
        action: 'REPORT_TRANSACTION',
        transactionId: id,
        userId,
        metadata: { caseReference, category: dto.category },
      });
  
      return {
        caseReference,
        message:
          'Your report has been submitted. Our team will review it and follow up with you shortly.',
      };
    }
  
    async getRateAverages(sinceDate?: string): Promise<{
      averages: Array<{
        descriptionType: string;
        contractType: string;
        avgAmount: number;
        avgHours: number;
        effectiveHourlyRate: number | null;
        transactionCount: number;
        totalAmount: number;
      }>;
      sinceDate: string;
      generatedAt: string;
    }> {
      const since = sinceDate
        ? new Date(sinceDate)
        : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000); // default 90 days

      const results = await this.repo
        .createQueryBuilder('t')
        .select('t.description_type', 'descriptionType')
        .addSelect('t.contract_type', 'contractType')
        .addSelect('AVG(t.amount)', 'avgAmount')
        .addSelect('AVG(t.description_hours)', 'avgHours')
        .addSelect('COUNT(*)', 'transactionCount')
        .addSelect('SUM(t.amount)', 'totalAmount')
        .where('t.status IN (:...statuses)', {
          statuses: ['paid', 'succeeded'],
        })
        .andWhere('t.date >= :since', { since })
        .andWhere('t.amount_direction = :dir', { dir: 'debit' })
        .groupBy('t.description_type')
        .addGroupBy('t.contract_type')
        .getRawMany();

      const averages = results.map((r) => ({
        descriptionType: r.descriptionType,
        contractType: r.contractType,
        avgAmount: parseFloat(r.avgAmount) || 0,
        avgHours: parseFloat(r.avgHours) || 0,
        effectiveHourlyRate:
          r.avgHours && parseFloat(r.avgHours) > 0
            ? parseFloat(r.avgAmount) / parseFloat(r.avgHours)
            : null,
        transactionCount: parseInt(r.transactionCount, 10),
        totalAmount: parseFloat(r.totalAmount) || 0,
      }));

      return {
        averages,
        sinceDate: since.toISOString(),
        generatedAt: new Date().toISOString(),
      };
    }

    private async generateReceiptPdf(
      transaction: Transaction,
    ): Promise<Buffer> {
      // Placeholder until full PDF implementation
      return Buffer.from(`Receipt for transaction ${transaction.transactionId}`);
    }
  }