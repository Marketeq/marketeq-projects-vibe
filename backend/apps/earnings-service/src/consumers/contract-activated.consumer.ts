import { Injectable }                              from '@nestjs/common';
import { Ctx, MessagePattern, Payload, RmqContext } from '@nestjs/microservices';
import { InjectRepository }                       from '@nestjs/typeorm';
import { Repository }                             from 'typeorm';
import { ConfigService }                          from '@nestjs/config';
import { BaseConsumer }                            from './base.consumer';
import { ContractLabelCache }                     from '../entities/contract-label-cache.entity';

@Injectable()
export class ContractActivatedConsumer extends BaseConsumer {
  constructor(
    config: ConfigService,
    @InjectRepository(ContractLabelCache)
    private readonly labelRepo: Repository<ContractLabelCache>,
  ) { super(config, 'ContractActivatedConsumer'); }

  @MessagePattern('contract.activated')
  async handle(@Payload() d: any, @Ctx() ctx: RmqContext): Promise<void> {
    const ch = ctx.getChannelRef(); const msg = ctx.getMessage(); let attempt = 0;
    while (attempt < this.retryMax) {
      attempt++;
      try {
        if (await this.isDuplicate(d.eventId, 'contract.activated')) {
          this.logger.warn(`Duplicate skipped: ${d.eventId}`); ch.ack(msg); return;
        }
        await this.labelRepo.createQueryBuilder()
          .insert().into(ContractLabelCache)
          .values({
            contractId:        d.contractId,
            contractorId:      d.contractorId,
            clientId:          d.clientId,
            projectId:         d.projectId         ?? null,
            contractTitle:     d.contractTitle      ?? null,
            projectName:       d.projectName        ?? null,
            clientDisplayName: d.clientDisplayName  ?? null,
            status:            'active',
            activatedAt:       new Date(d.activatedAt),
          })
          .orUpdate(
            ['contract_title','project_name','client_display_name','status','updated_at'],
            ['contract_id'],
          )
          .execute();
        this.logger.log(`contract.activated: label cached for ${d.contractId}`);
        ch.ack(msg); return;
      } catch (err: any) {
        this.logger.warn(`Attempt ${attempt}/${this.retryMax}: ${err.message}`);
        if (attempt < this.retryMax) { await this.sleep(this.backoffMs(attempt)); }
        else { this.logger.error('Exhausted → DLQ', { d }); ch.nack(msg, false, false); }
      }
    }
  }
}
