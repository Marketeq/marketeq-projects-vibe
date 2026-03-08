import { Controller } from '@nestjs/common'
import { EventPattern, Payload } from '@nestjs/microservices'
import { TransactionService } from '../services/transaction.service'
import { TransactionType, TransactionStatus, AmountDirection } from '../entities/transaction.entity'

@Controller()
export class PayoutConsumer {
  constructor(private readonly txSvc: TransactionService) {}

  @EventPattern('payout_initiated')
  async onPayoutInitiated(@Payload() data: any) {
    await this.txSvc.recordFromEvent({
      userId: data.userId,
      type: TransactionType.DEPOSIT,
      status: TransactionStatus.PENDING,
      direction: AmountDirection.DEBIT,
      amount: data.amount,
      currency: data.currency,
      description: 'Payout initiated to bank account',
    })
  }

  @EventPattern('payout_completed')
  async onPayoutCompleted(@Payload() data: any) {
    if (data.transactionId) {
      await this.txSvc.updateStatus(data.transactionId, TransactionStatus.SUCCEEDED)
    }
  }

  @EventPattern('payout_failed')
  async onPayoutFailed(@Payload() data: any) {
    if (data.transactionId) {
      await this.txSvc.updateStatus(data.transactionId, TransactionStatus.FAILED)
    }
  }
}
