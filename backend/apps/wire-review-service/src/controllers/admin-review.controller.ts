import { Controller, Post, Body, HttpCode } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WireMatchCandidate } from '../entities/wire-match-candidate.entity';

@Controller('admin/wire-review')
export class AdminReviewController {
  constructor(
    @InjectRepository(WireMatchCandidate)
    private readonly wireMatchRepo: Repository<WireMatchCandidate>
  ) {}

  @Post('resolve')
  @HttpCode(200)
  async resolveReview(@Body() body: { transactionId: string; status: 'confirmed' | 'flagged'; adminId: string; reason?: string }) {
    const record = await this.wireMatchRepo.findOne({ where: { transactionId: body.transactionId } });
    if (!record) return { success: false, message: 'Transaction not found' };

    record.status = body.status;
    record.rawPayload = {
      ...record.rawPayload,
      adminResolution: {
        resolvedBy: body.adminId,
        reason: body.reason || 'Manually resolved',
        resolvedAt: new Date().toISOString()
      }
    };

    await this.wireMatchRepo.save(record);
    return { success: true, message: `Marked as ${body.status}` };
  }
}