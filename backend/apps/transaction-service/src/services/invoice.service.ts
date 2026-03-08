import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Invoice, InvoiceStatus } from '../entities/invoice.entity'
import { AuditLog, AuditAction } from '../entities/audit-log.entity'
import { InvoiceFilterDto, PaginatedResponseDto } from '../dto/filter.dto'
import Stripe from 'stripe'

@Injectable()
export class InvoiceService {
  private readonly logger = new Logger(InvoiceService.name)
  private readonly stripe: Stripe

  constructor(
    @InjectRepository(Invoice)
    private readonly invoiceRepo: Repository<Invoice>,
    @InjectRepository(AuditLog)
    private readonly auditRepo: Repository<AuditLog>,
  ) {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2025-02-24.acacia' })
  }

  async findAll(userId: string, filter: InvoiceFilterDto): Promise<PaginatedResponseDto<Invoice>> {
    const { status, dateFrom, dateTo, page = 1, limit = 10 } = filter

    const qb = this.invoiceRepo.createQueryBuilder('inv')
      .where('inv.userId = :userId', { userId })
      .orderBy('inv.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)

    if (status) qb.andWhere('inv.status = :status', { status })
    if (dateFrom) qb.andWhere('inv.createdAt >= :dateFrom', { dateFrom: new Date(dateFrom) })
    if (dateTo) qb.andWhere('inv.createdAt <= :dateTo', { dateTo: new Date(dateTo) })

    const [data, total] = await qb.getManyAndCount()

    await this.auditRepo.save({
      userId,
      resourceType: 'invoice',
      resourceId: null,
      action: AuditAction.VIEW,
      metadata: { filter },
    })

    return PaginatedResponseDto.of(data, total, page, limit)
  }

  async findOne(userId: string, id: string): Promise<Invoice> {
    const invoice = await this.invoiceRepo.findOne({ where: { id } })

    if (!invoice) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Invoice not found.' })
    }
    if (invoice.userId !== userId) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'You do not have access to this invoice.' })
    }

    // Refresh Stripe hosted URL if available
    if (invoice.stripeInvoiceId && !invoice.hostedInvoiceUrl) {
      try {
        const stripeInvoice = await this.stripe.invoices.retrieve(invoice.stripeInvoiceId)
        invoice.hostedInvoiceUrl = stripeInvoice.hosted_invoice_url ?? null
        invoice.invoicePdfUrl = stripeInvoice.invoice_pdf ?? null
        await this.invoiceRepo.save(invoice)
      } catch (err) {
        this.logger.warn(`Failed to fetch Stripe invoice ${invoice.stripeInvoiceId}`, err)
      }
    }

    await this.auditRepo.save({
      userId,
      resourceType: 'invoice',
      resourceId: id,
      action: AuditAction.VIEW,
      metadata: null,
    })

    return invoice
  }

  async recordFromEvent(data: {
    userId: string
    transactionId?: string
    stripeInvoiceId?: string
    invoiceNumber: string
    status: InvoiceStatus
    amount: number
    currency?: string
    dueDate?: string
    description?: string
    hostedInvoiceUrl?: string
    invoicePdfUrl?: string
  }): Promise<Invoice> {
    const invoice = this.invoiceRepo.create({
      ...data,
      currency: data.currency ?? 'USD',
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
    })
    const saved = await this.invoiceRepo.save(invoice)
    this.logger.log(`Recorded invoice ${saved.id} number=${saved.invoiceNumber}`)
    return saved
  }

  async updateStatus(stripeInvoiceId: string, status: InvoiceStatus): Promise<void> {
    await this.invoiceRepo.update({ stripeInvoiceId }, { status })
    this.logger.log(`Updated invoice (stripe=${stripeInvoiceId}) status to ${status}`)
  }
}
