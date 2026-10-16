import { Controller, Post, Body, HttpCode, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WireMatchCandidate } from '../entities/wire-match-candidate.entity';
import { InternalServiceGuard } from '../guards/internal-service.guard';

// Confirms or flags a wire transfer. Previously unguarded, with the
// resolver's identity taken from the request body — the caller stated who
// they were, and that claim was written into the record as the audit trail.
// Now requires the internal-service token; `adminId` is still recorded but
// is no longer the only thing standing between a caller and a settled wire.
// When roles exist, add a role check here so a named human authorises it.
@Controller('admin/wire-review')
@UseGuards(InternalServiceGuard)
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