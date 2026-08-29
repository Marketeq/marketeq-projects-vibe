import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

/**
 * Encrypts the taxpayer identification number at rest.
 *
 * Mirrors BankEncryptionService in payout-service so there is one shape for
 * field-level encryption across the platform. The TIN is the most sensitive
 * value this service holds and PS-26 requires it be stored encrypted.
 */
@Injectable()
export class TinEncryptionService {
  private readonly logger = new Logger(TinEncryptionService.name);
  private readonly KEY: Buffer;
  private readonly ALG = 'aes-256-gcm' as const;

  constructor(private readonly config: ConfigService) {
    const keyHex = this.config.get('TAX_TIN_ENCRYPTION_KEY', '');
    if (keyHex.length === 64) {
      this.KEY = Buffer.from(keyHex, 'hex');
    } else {
      this.logger.warn(
        'TAX_TIN_ENCRYPTION_KEY not configured or invalid — using an ephemeral key. ' +
          'Stored TINs will not be readable after a restart.',
      );
      this.KEY = randomBytes(32);
    }
  }

  encrypt(plaintext: string): string {
    if (!plaintext) return '';
    const iv = randomBytes(12);
    const cipher = createCipheriv(this.ALG, this.KEY, iv);
    const enc = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);
    return [
      iv.toString('hex'),
      cipher.getAuthTag().toString('hex'),
      enc.toString('hex'),
    ].join(':');
  }

  /** Tolerates values written before encryption was introduced. */
  decrypt(stored?: string | null): string {
    if (!stored) return '';
    if (stored.split(':').length !== 3) return stored;
    try {
      const [ivHex, tagHex, ctHex] = stored.split(':');
      const decipher = createDecipheriv(
        this.ALG,
        this.KEY,
        Buffer.from(ivHex, 'hex'),
      );
      decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
      return (
        decipher.update(Buffer.from(ctHex, 'hex'), undefined, 'utf8') +
        decipher.final('utf8')
      );
    } catch {
      this.logger.warn('Could not decrypt a stored TIN');
      return '';
    }
  }

  last4(plain: string): string | null {
    const digits = plain.replace(/\D/g, '');
    return digits.length >= 4 ? digits.slice(-4) : null;
  }
}
