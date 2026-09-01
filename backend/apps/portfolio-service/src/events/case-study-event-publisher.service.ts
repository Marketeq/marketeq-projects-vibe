import { Injectable, Optional, Inject, Logger } from '@nestjs/common';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { CaseStudy } from '../entities/case-study.entity';

const EXCHANGE = 'marketeq.case_studies';

@Injectable()
export class CaseStudyEventPublisher {
  private readonly logger = new Logger(CaseStudyEventPublisher.name);

  // NOTE: the `| null` union on its own breaks Nest's implicit type-based injection
  // (TS erases the union in emitted design:paramtypes), so @Inject(AmqpConnection)
  // is required here even though the type annotation looks redundant with it.
  constructor(@Optional() @Inject(AmqpConnection) private readonly amqp: AmqpConnection | null) {}

  async publishCreated(cs: CaseStudy): Promise<void> {
    await this.publish('case_study.created', {
      caseStudyId: cs.id,
      ownerUserId: cs.ownerUserId,
      title: cs.title,
      createdAt: cs.createdAt.toISOString(),
    });
  }

  async publishDraftSaved(cs: CaseStudy): Promise<void> {
    const blockCount = (cs.schemaJson as any)?.blocks?.length ?? 0;
    await this.publish('case_study.draft_saved', {
      caseStudyId: cs.id,
      ownerUserId: cs.ownerUserId,
      blockCount,
      updatedAt: cs.updatedAt.toISOString(),
    });
  }

  async publishPublished(cs: CaseStudy): Promise<void> {
    const appUrl = process.env.APP_URL || '';
    await this.publish('case_study.published', {
      caseStudyId: cs.id,
      ownerUserId: cs.ownerUserId,
      slug: cs.slug,
      publicUrl: `${appUrl}/casestudies/${cs.slug}`,
      publishedAt: cs.updatedAt.toISOString(),
    });
  }

  async publishDeleted(caseStudyId: string, ownerUserId: string): Promise<void> {
    await this.publish('case_study.deleted', {
      caseStudyId,
      ownerUserId,
      deletedAt: new Date().toISOString(),
    });
  }

  private async publish(routingKey: string, payload: Record<string, any>): Promise<void> {
    if (!this.amqp) {
      this.logger.warn(`RabbitMQ disabled — skipping ${routingKey} event`);
      return;
    }
    try {
      await this.amqp.publish(EXCHANGE, routingKey, payload);
    } catch (err) {
      // Event delivery is best-effort: a broker hiccup must not fail the HTTP request that triggered it.
      this.logger.warn(`Failed to publish ${routingKey}: ${err}`);
    }
  }
}
