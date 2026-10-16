import {
  Body,
  Controller,
  Get,
  Put,
  ConflictException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { CurrentUser } from '../decorators/current-user.decorator';
import { JwtUser } from '../auth/types/jwt-user.type';
import {
  ServerSecretMissingError,
  UserKeysService,
} from './user-keys.service';
import { StoreEncryptedPrivateKeyDto } from './dtos/store-encrypted-private-key.dto';
import { BackupPrivateKeyDto } from './dtos/backup-private-key.dto';

@Controller('user-keys')
export class UserKeysController {
  constructor(private readonly userKeysService: UserKeysService) {}

  // ── Legacy: the browser wraps, the server just stores the blob ─────────
  // Superseded by the backup/restore pair below (Security Tasklist item #2,
  // Phase 1). Kept so clients that have not been updated keep working.
  // Remove once the frontend no longer calls it.

  @Get('private-key')
  getEncryptedPrivateKey(@CurrentUser() user: JwtUser) {
    return this.userKeysService.getEncryptedPrivateKey(user.sub);
  }

  @Put('private-key')
  storeEncryptedPrivateKey(
    @CurrentUser() user: JwtUser,
    @Body() body: StoreEncryptedPrivateKeyDto,
  ) {
    return this.userKeysService.storeEncryptedPrivateKey(
      user.sub,
      body.encryptedPrivateKey,
      body.publicKey,
    );
  }

  // ── Current: the server wraps, and the wrapping key never leaves it ────

  /**
   * Store the caller's private key for recovery. The key is encrypted at rest
   * with material derived in-process; the browser never holds or derives it.
   */
  @Put('private-key/backup')
  async backupPrivateKey(
    @CurrentUser() user: JwtUser,
    @Body() body: BackupPrivateKeyDto,
  ) {
    try {
      return await this.userKeysService.backupPrivateKey(
        user.sub,
        body.privateKey,
        body.publicKey,
      );
    } catch (err) {
      throw translate(err);
    }
  }

  /**
   * Return the caller's private key. `privateKey: null` means there is no
   * usable backup — a normal answer, not a failure; the client should keep or
   * generate its local keypair.
   */
  @Get('private-key/restore')
  async restorePrivateKey(@CurrentUser() user: JwtUser) {
    try {
      return await this.userKeysService.restorePrivateKey(user.sub);
    } catch (err) {
      throw translate(err);
    }
  }

  /** Whether a usable backup exists, without decrypting it. */
  @Get('private-key/status')
  backupStatus(@CurrentUser() user: JwtUser) {
    return this.userKeysService.backupStatus(user.sub);
  }
}

/**
 * A missing server secret is an operator problem, not a client one, so it is
 * a 503 rather than a 500 — and the message never echoes the secret or its
 * absence to the browser beyond what an operator needs to recognise it.
 */
function translate(err: unknown): Error {
  if (err instanceof ServerSecretMissingError) {
    return new ServiceUnavailableException(
      'Key recovery is not configured on this environment.',
    );
  }
  if (err instanceof Error && err.message.startsWith('A private-key backup already exists')) {
    return new ConflictException(err.message);
  }
  return err instanceof Error ? err : new Error(String(err));
}
