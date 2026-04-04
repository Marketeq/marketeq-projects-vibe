import { Injectable, Logger } from '@nestjs/common';
import { ConfigService }      from '@nestjs/config';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

@Injectable()
export class BankEncryptionService {
  private readonly logger = new Logger(BankEncryptionService.name);
  private readonly KEY: Buffer;
  private readonly ALG = 'aes-256-gcm' as const;

  constructor(private readonly config: ConfigService) {
    const keyHex = this.config.get('BANK_ENCRYPTION_KEY', '');
    if (keyHex.length === 64) {
      this.KEY = Buffer.from(keyHex, 'hex');
    } else {
      this.logger.warn('BANK_ENCRYPTION_KEY not configured or invalid — encryption disabled');
      this.KEY = randomBytes(32); // fallback for dev
    }
  }

  encrypt(plaintext: string): string {
    if (!plaintext) return '';
    const iv = randomBytes(12);
    const cipher = createCipheriv(this.ALG, this.KEY, iv);
    const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return [iv.toString('hex'), tag.toString('hex'), enc.toString('hex')].join(':');
  }

  decrypt(stored: string): string {
    if (!stored || !stored.includes(':')) return stored;
    const [ivHex, tagHex, ctHex] = stored.split(':');
    const decipher = createDecipheriv(this.ALG, this.KEY, Buffer.from(ivHex, 'hex'));
    decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
    return decipher.update(Buffer.from(ctHex, 'hex'), undefined, 'utf8') + decipher.final('utf8');
  }

  last4(value: string): string {
    if (!value || value.length < 4) return '????';
    return value.slice(-4);
  }
}
