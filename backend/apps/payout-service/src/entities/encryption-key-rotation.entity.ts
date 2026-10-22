// apps/payout-service/src/entities/encryption-key-rotation.entity.ts
// AC-1.3.3: a durable record of which encryption key is in force for each
// ring, and since when.
//
// The ciphertext itself records which key encrypted it (see
// crypto/field-encryption.ts). This table answers the other half: when did a
// key take over, which key did it replace, and what was running at any past
// date. Without it, "when was this key changed?" is answerable only from
// deploy history and memory, which is exactly the question an auditor or an
// incident asks.
//
// Rows are written automatically at startup by KeyRotationRecorderService the
// first time a service boots with a new current key. Nothing writes to this
// table by hand, and nothing updates a row once written.

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  Unique,
} from 'typeorm';

@Entity('encryption_key_rotations')
@Unique('ekr_ring_key_uq', ['ring', 'keyId'])
@Index('ekr_ring_recorded_idx', ['ring', 'recordedAt'])
export class EncryptionKeyRotation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Which family of keys: BANK, OAUTH_TOKEN, CRYPTO_ADDRESS. */
  @Column({ type: 'varchar', length: 64 })
  ring: string;

  /** The key id that became current, as it appears in stored ciphertext. */
  @Column({ name: 'key_id', type: 'varchar', length: 16 })
  keyId: string;

  /** The key it replaced. Null for the first key ever recorded for a ring. */
  @Column({ name: 'previous_key_id', type: 'varchar', length: 16, nullable: true })
  previousKeyId: string | null;

  /**
   * Every key the process could still decrypt with at the moment of the
   * change, comma separated. Shows whether old data was still readable when
   * the key moved, which is the question after a key is retired too early.
   */
  @Column({ name: 'known_key_ids', type: 'text' })
  knownKeyIds: string;

  /**
   * How the change was noticed. Today always 'startup-detected', since the
   * recorder infers it from configuration rather than being told. A manual
   * rotation tool would write its own value here.
   */
  @Column({ name: 'detected_by', type: 'varchar', length: 32, default: 'startup-detected' })
  detectedBy: string;

  @CreateDateColumn({ name: 'recorded_at', type: 'timestamptz' })
  recordedAt: Date;
}
