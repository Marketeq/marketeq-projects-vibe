// apps/offer-service/src/users/user-deletion.handler.ts
// OS-36: Processes user.account_deleted RabbitMQ event.
// Withdraws active offers, pseudonymizes userId, preserves history.
import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { OutboxService } from '../outbox/outbox.service';
import { OFFER_EXCHANGE } from '../messaging/constants/rabbitmq.constants';
import { OFFER_EVENTS } from '../messaging/events/offer-events';

/**
 * Sentinel UUID for deleted accounts.
 * Replaces userId in all offer records after account deletion.
 */
export const DELETED_USER_SENTINEL = '00000000-0000-0000-0000-000000000000';

@Injectable()
export class UserDeletionHandler {
  private readonly logger = new Logger(UserDeletionHandler.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly outboxService: OutboxService,
  ) {}

  /**
   * handle(deletedUserId)
   *
   * 1. Withdraw PENDING/COUNTERED offers where user is client or talent.
   * 2. Withdraw PENDING COs submitted by the deleted user.
   * 3. Pseudonymize userId in all offer/CO/history records.
   * 4. Clear message fields submitted by the deleted user (GDPR).
   * 5. Write outbox events for withdrawn offers.
   */
  async handle(deletedUserId: string): Promise<void> {
    this.logger.log(`Processing account deletion for user ${deletedUserId}`);

    await this.dataSource.transaction(async (em) => {
      // Step 1: Withdraw active offers where user is CLIENT
      const clientOffers = await em.query(`
        UPDATE offer_service.offers
          SET status = 'WITHDRAWN', withdrawn_at = NOW(), withdrawal_message = NULL, updated_at = NOW()
        WHERE client_id = $1 AND status IN ('PENDING', 'COUNTERED')
        RETURNING id
      `, [deletedUserId]);

      // Step 2: Withdraw active offers where user is TALENT
      const talentOffers = await em.query(`
        UPDATE offer_service.offers
          SET status = 'WITHDRAWN', withdrawn_at = NOW(), withdrawal_message = NULL, updated_at = NOW()
        WHERE talent_id = $1 AND status IN ('PENDING', 'COUNTERED')
        RETURNING id
      `, [deletedUserId]);

      const clientRows = Array.isArray(clientOffers[0]) ? clientOffers[0] : clientOffers;
      const talentRows = Array.isArray(talentOffers[0]) ? talentOffers[0] : talentOffers;
      const allWithdrawnIds = [
        ...clientRows.filter((r: any) => r?.id).map((r: any) => r.id),
        ...talentRows.filter((r: any) => r?.id).map((r: any) => r.id),
      ];

      // Step 3: Withdraw PENDING COs submitted by the deleted user
      await em.query(`
        UPDATE offer_service.counter_offers
          SET status = 'WITHDRAWN', withdrawn_at = NOW(), updated_at = NOW()
        WHERE submitted_by_id = $1 AND status = 'PENDING'
      `, [deletedUserId]);

      // Step 4: Pseudonymize userId + clear PII in ALL records
      await em.query(`
        UPDATE offer_service.offers
          SET client_id = CASE WHEN client_id = $1 THEN $2 ELSE client_id END,
              talent_id = CASE WHEN talent_id = $1 THEN $2 ELSE talent_id END,
              message = CASE WHEN client_id = $1 THEN NULL ELSE message END,
              updated_at = NOW()
        WHERE client_id = $1 OR talent_id = $1
      `, [deletedUserId, DELETED_USER_SENTINEL]);

      await em.query(`
        UPDATE offer_service.counter_offers
          SET submitted_by_id = $2,
              message = CASE WHEN submitted_by_id = $1 THEN NULL ELSE message END,
              updated_at = NOW()
        WHERE submitted_by_id = $1
      `, [deletedUserId, DELETED_USER_SENTINEL]);

      await em.query(`
        UPDATE offer_service.offer_history
          SET actor_id = $2
        WHERE actor_id = $1
      `, [deletedUserId, DELETED_USER_SENTINEL]);

      // Step 5: Write outbox events for withdrawn offers
      for (const offerId of allWithdrawnIds) {
        await this.outboxService.write({
          aggregateId: offerId,
          eventType: OFFER_EVENTS.WITHDRAWN,
          routingKey: OFFER_EVENTS.WITHDRAWN,
          exchange: OFFER_EXCHANGE,
          payload: { offerId, reason: 'ACCOUNT_DELETED' },
        }, em);
      }

      this.logger.log(
        `Account deletion complete: user=${deletedUserId} withdrawn=${allWithdrawnIds.length} offers`,
      );
    });
  }
}