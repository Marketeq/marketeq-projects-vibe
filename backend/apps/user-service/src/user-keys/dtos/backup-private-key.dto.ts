import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

/**
 * Carries the private key PEM itself, not a pre-wrapped blob. Wrapping is the
 * server's job as of Security Tasklist item #2 Phase 1 — see
 * UserKeysService.backupPrivateKey. The payload is protected in transit by
 * TLS and at rest by a key derived in-process.
 */
export class BackupPrivateKeyDto {
  @IsNotEmpty()
  @IsString()
  @MinLength(64)
  @MaxLength(50000)
  privateKey: string;

  /**
   * Required, not optional. It is what stops a second browser's unrelated
   * keypair from silently replacing the backup the user's conversation keys
   * are wrapped against.
   */
  @IsNotEmpty()
  @IsString()
  @MinLength(64)
  @MaxLength(12000)
  publicKey: string;
}
