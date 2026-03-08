import {
  Injectable, Logger, NotFoundException, ForbiddenException, ConflictException,
  TooManyRequestsException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, Between, ILike } from 'typeorm'
import { Transaction, TransactionStatus } from '../entities/transaction.entity'
import { AuditLog, AuditAction } from '../entities/audit-log.entity'
import { TransactionFilterDto, PaginatedResponseDto } from '../dto/filter.dto'
import { ProblemReportDto } from '../dto/problem-report.dto'

const IMMUTABLE_STATUSES: TransactionStatus[] = [
  TransactionStatus.PAID,
  TransactionStatus.SUCCEEDED,
  TransactionStatus.REFUNDED,
]

const MAX_PROBLEM_REPORTS = 3

@Injectable()
export class TransactionService {
  private readonly logger = new Logger(TransactionService.name)

  constructor(
    @InjectRepository(Transaction)
    private readonly txRepo: Repository<Transaction>,
    @InjectRepository(AuditLog)
    private readonly auditRepo: Repository<AuditLog>,
  ) {}

  async findAll(userId: string, filter: TransactionFilterDto): Promise<PaginatedResponseDto<Transaction>> {
    const { type, status, dateFrom, dateTo, search, page = 1, limit = 10 } = filter

    const qb = this.txRepo.createQueryBuilder('tx')
      .where('tx.userId = :userId', { userId })
      .orderBy('tx.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)

    if (type) qb.andWhere('tx.type = :type', { type })
    if (status) qb.andWhere('tx.status = :status', { status })
    if (dateFrom) qb.andWhere('tx.createdAt >= :dateFrom', { dateFrom: new Date(dateFrom) })
    if (dateTo) qb.andWhere('tx.createdAt <= :dateTo', { dateTo: new Date(dateTo) })
    if (search) qb.andWhere('tx.description ILIKE :search', { search: `%${search}%` })

    const [data, total] = await qb.getManyAndCount()

    await this.auditRepo.save({
      userId,
      resourceType: 'transaction',
      resourceId: null,
      action: AuditAction.VIEW,
      metadata: { filter },
    })

    return PaginatedResponseDto.of(data, total, page, limit)
  }

  async findOne(userId: string, id: string): Promise<Transaction> {
    const tx = await this.txRepo.findOne({
      where: { id },
      relations: ['contract', 'paymentMethod'],
    })

    if (!tx) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Transaction not found.' })
    }
    if (tx.userId !== userId) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'You do not have access to this transaction.' })
    }

    await this.auditRepo.save({
      userId,
      resourceType: 'transaction',
      resourceId: id,
      action: AuditAction.VIEW,
      metadata: null,
    })

    return tx
  }

  async reportProblem(userId: string, id: string, dto: ProblemReportDto): Promise<{ message: string }> {
    const tx = await this.txRepo.findOne({ where: { id } })

    if (!tx) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Transaction not found.' })
    }
    if (tx.userId !== userId) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'You do not have access to this transaction.' })
    }
    if (tx.problemReportCount >= MAX_PROBLEM_REPORTS) {
      throw new TooManyRequestsException({
        code: 'RATE_LIMITED',
        message: 'You have already submitted the maximum number of problem reports for this transaction.',
      })
    }

    await this.txRepo.update(id, { problemReportCount: tx.problemReportCount + 1 })

    await this.auditRepo.save({
      userId,
      resourceType: 'transaction',
      resourceId: id,
      action: AuditAction.PROBLEM_REPORT,
      metadata: { reason: dto.reason },
    })

    this.logger.log(`Problem reported on transaction ${id} by user ${userId}`)
    return { message: 'Your problem report has been submitted.' }
  }

  // Called by RabbitMQ consumers
  async recordFromEvent(data: {
    userId: string
    type: any
    status: any
    direction: any
    amount: number
    currency?: string
    description?: string
    stripePaymentIntentId?: string
    stripeInvoiceId?: string
    parentTransactionId?: string
    fee?: number
    billingFrequency?: any
    membershipTier?: any
    dueDate?: string
    paidAt?: string
  }): Promise<Transaction> {
    const tx = this.txRepo.create({
      ...data,
      currency: data.currency ?? 'USD',
      net: data.fee != null ? data.amount - data.fee : data.amount,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      paidAt: data.paidAt ? new Date(data.paidAt) : null,
    })
    const saved = await this.txRepo.save(tx)
    this.logger.log(`Recorded transaction ${saved.id} type=${saved.type} status=${saved.status}`)
    return saved
  }

  async updateStatus(id: string, status: TransactionStatus): Promise<void> {
    const tx = await this.txRepo.findOne({ where: { id } })
    if (!tx) return

    if (IMMUTABLE_STATUSES.includes(tx.status)) {
      throw new ConflictException({
        code: 'IMMUTABLE_RECORD',
        message: 'This transaction record is immutable and cannot be updated.',
      })
    }

    await this.txRepo.update(id, { status })
    this.logger.log(`Updated transaction ${id} status to ${status}`)
  }
}
