import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { plainToInstance } from 'class-transformer';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';

import { Invoice } from '../entities/invoice.entity';
import { InvoiceFilterDto } from '../dto/filter.dto';
import {
  InvoiceResponseDto,
  InvoiceDetailResponseDto,
} from '../dto/invoice.dto';
import { PaginatedResponseDto } from '../dto/pagination.dto';
import { AuditService } from './audit.service';

@Injectable()
export class InvoiceService {
  constructor(
    @InjectRepository(Invoice)
    private readonly repo: Repository<Invoice>,
    private readonly stripeClient: HttpService,
    private readonly config: ConfigService,
    private readonly auditService: AuditService,
  ) {}

  async findAll(
    userId: string,
    filters: InvoiceFilterDto,
  ): Promise<PaginatedResponseDto<InvoiceResponseDto>> {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 10;

    const [items, total] = await this.repo.findAndCount({
      where: { userId },
      order: { dateIssued: 'DESC', updatedAt: 'DESC' },
      take: limit,
      skip: (page - 1) * limit,
      relations: ['contract'],
    });

    const dtos = items.map((item) =>
      plainToInstance(InvoiceResponseDto, item, {
        excludeExtraneousValues: true,
      }),
    );

    return PaginatedResponseDto.of(dtos, total, page, limit);
  }

  async countFiltered(
    userId: string,
    filters: InvoiceFilterDto,
  ): Promise<number> {
    const qb = this.repo
      .createQueryBuilder('i')
      .where('i.user_id = :userId', { userId });

    if (filters.dateFrom) {
      qb.andWhere('i.date_issued >= :dateFrom', { dateFrom: filters.dateFrom });
    }
    if (filters.dateTo) {
      qb.andWhere('i.date_issued <= :dateTo', { dateTo: filters.dateTo });
    }
    if (filters.status) {
      qb.andWhere('i.status = :status', { status: filters.status });
    }
    if (filters.contractId) {
      qb.andWhere('i.contract_id = :contractId', {
        contractId: filters.contractId,
      });
    }
    if (filters.search) {
      const term = `%${filters.search.toLowerCase()}%`;
      qb.andWhere(
        `(LOWER(i.invoice_id) LIKE :term
          OR LOWER(i.description_type) LIKE :term
          OR CAST(i.amount AS TEXT) LIKE :term)`,
        { term },
      );
    }

    return qb.getCount();
  }

  async findOne(
    id: string,
    userId: string,
  ): Promise<InvoiceDetailResponseDto> {
    const invoice = await this.repo.findOne({
      where: { id, userId },
      relations: ['contract'],
    });

    if (!invoice) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message:
          'This invoice ID appears to be invalid. Please contact support if you believe this is an error.',
      });
    }

    let stripeHostedUrl: string | null = null;
    let stripePdfUrl: string | null = null;

    if (invoice.stripeInvoiceId) {
      try {
        const stripeInvoice = await this.stripeClient.axiosRef.get(
          `https://api.stripe.com/v1/invoices/${invoice.stripeInvoiceId}`,
          {
            headers: {
              Authorization: `Bearer ${this.config.get<string>('STRIPE_SECRET_KEY')}`,
            },
          },
        );

        stripeHostedUrl = stripeInvoice.data.hosted_invoice_url;
        stripePdfUrl = stripeInvoice.data.invoice_pdf;
      } catch {
        // Non-fatal — invoice detail returns without Stripe URLs
      }
    }

    await this.auditService.log({
      action: 'VIEW_INVOICE_DETAIL',
      invoiceId: id,
      userId,
    });

    return plainToInstance(
      InvoiceDetailResponseDto,
      { ...invoice, stripeHostedUrl, stripePdfUrl },
      { excludeExtraneousValues: true },
    );
  }
}