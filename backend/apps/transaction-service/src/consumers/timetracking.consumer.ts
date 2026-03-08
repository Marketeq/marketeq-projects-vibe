import { Controller } from '@nestjs/common'
import { EventPattern, Payload } from '@nestjs/microservices'
import { TransactionService } from '../services/transaction.service'
import { TransactionType, TransactionStatus, AmountDirection } from '../entities/transaction.entity'

@Controller()
export class TimeTrackingConsumer {
  constructor(private readonly txSvc: TransactionService) {}

  @EventPattern('earning_credited')
  async onEarningCredited(@Payload() data: any) {
    await this.txSvc.recordFromEvent({
      userId: data.contractorId,
      type: TransactionType.HOURLY_PAYMENT,
      status: TransactionStatus.CREDITED,
      direction: AmountDirection.CREDIT,
      amount: data.amount,
      currency: data.currency,
      description: `Earnings credited for ${data.hours ?? 0} hours`,
    })
  }
}
