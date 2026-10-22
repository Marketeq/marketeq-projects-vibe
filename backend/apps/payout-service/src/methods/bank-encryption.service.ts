import { Injectable, Logger } from '@nestjs/common';
import { ConfigService }      from '@nestjs/config';
import { FieldEncryption, RINGS } from '../crypto/field-encryption';

@Injectable()
export class BankEncryptionService {
  private readonly logger = new Logger(BankEncryptionService.name);
  private readonly ring: FieldEncryption;

  constructor(private readonly config: ConfigService) {
    // Key handling moved into FieldEncryption so several keys can be live at
    // once and a rotation no longer makes stored account numbers permanently
    // unreadable (AC-1.3.3). Behaviour that has not changed: a missing or
    // malformed key still refuses to start rather than inventing one, and the
    // single-key BANK_ENCRYPTION_KEY form every environment sets today keeps
    // working, registered as k1.
    this.ring = new FieldEncryption(RINGS.BANK, (k) => this.config.get<string>(k));
  }

  encrypt(plaintext: string): string {
    return this.ring.encrypt(plaintext);
  }

  decrypt(stored: string): string {
    return this.ring.decrypt(stored);
  }

  /** The key new values are written under. */
  currentKeyId(): string {
    return this.ring.currentKeyId();
  }

  /** True when a stored value was written under an older key and should be moved. */
  needsReEncryption(stored: string): boolean {
    return this.ring.needsReEncryption(stored);
  }

  /** Re-encrypt under the current key. Returns the input unchanged if already current. */
  reEncrypt(stored: string): string {
    return this.ring.reEncrypt(stored);
  }

  last4(value: string): string {
    if (!value || value.length < 4) return '????';
    return value.slice(-4);
  }
}
