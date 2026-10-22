import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EncryptionKeyRotation } from '../entities/encryption-key-rotation.entity';
import { FieldEncryption, RINGS, RingConfig } from './field-encryption';

/**
 * Writes the "when did this key take over" half of AC-1.3.3.
 *
 * At startup it reads the current key id for each ring and compares it with
 * the last one recorded. When they differ it appends a row. Nobody has to
 * remember to log a rotation, because the rotation is inferred from the
 * configuration the service is actually running with.
 *
 * Every instance of every replica runs this, so the insert has to be safe to
 * attempt repeatedly. The unique index on (ring, key_id) makes it so: the
 * first insert wins and the rest are swallowed.
 *
 * This never blocks startup. A missing table or an unreachable database costs
 * a log line, not an outage — the recorder is bookkeeping, and refusing to
 * serve payouts because bookkeeping failed would be the wrong trade.
 */
@Injectable()
export class KeyRotationRecorderService implements OnModuleInit {
  private readonly logger = new Logger(KeyRotationRecorderService.name);

  constructor(
    @InjectRepository(EncryptionKeyRotation)
    private readonly repo: Repository<EncryptionKeyRotation>,
    private readonly config: ConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    for (const ring of Object.values(RINGS) as RingConfig[]) {
      try {
        await this.recordRing(ring);
      } catch (err: any) {
        this.logger.warn(
          `Could not record the key state for ring ${ring.ring}: ${err?.message ?? err}`,
        );
      }
    }
  }

  private async recordRing(cfg: RingConfig): Promise<void> {
    const ring = new FieldEncryption(cfg, (k) => this.config.get<string>(k));
    const current = ring.currentKeyId();

    const last = await this.repo.findOne({
      where: { ring: cfg.ring },
      order: { recordedAt: 'DESC' },
    });

    if (last?.keyId === current) return; // nothing changed

    const row = this.repo.create({
      ring: cfg.ring,
      keyId: current,
      previousKeyId: last?.keyId ?? null,
      knownKeyIds: ring.knownKeyIds().join(','),
      detectedBy: 'startup-detected',
    });

    try {
      await this.repo.save(row);
    } catch (err: any) {
      // Another replica won the race against the unique index. Expected.
      if (isUniqueViolation(err)) return;
      throw err;
    }

    if (last) {
      this.logger.warn(
        `Encryption key for ring ${cfg.ring} changed from ${last.keyId} to ${current}. ` +
          `Keys still readable: ${ring.knownKeyIds().join(', ')}. ` +
          `Existing rows stay readable under ${last.keyId} until they are re-encrypted — ` +
          `do not remove ${cfg.envPrefix}_${last.keyId.toUpperCase()} before that is done.`,
      );
    } else {
      this.logger.log(
        `Recorded the first encryption key for ring ${cfg.ring}: ${current}.`,
      );
    }
  }
}

/** Postgres 23505, however the driver happens to surface it. */
function isUniqueViolation(err: any): boolean {
  return err?.code === '23505' || /duplicate key value/i.test(err?.message ?? '');
}
