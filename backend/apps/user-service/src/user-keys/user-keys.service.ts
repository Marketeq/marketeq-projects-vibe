import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import * as crypto from "crypto";
import { UserKey } from "./entities/user-key.entity";
import { UserDevice } from "./entities/user-device.entity";
import { RegisterDeviceDto } from "./dtos/register-device.dto";

/**
 * Stored blob formats, newest first. The reader is format-aware so that a
 * row written by any of them can still be read; the writer only ever emits v2.
 *
 *   v2        `v2:<salt>:<iv>:<tag>:<ciphertext>`, all base64.
 *             Wrapped server-side. Key = scrypt(E2EE_SERVER_SECRET:<userId>,
 *             <salt>). Fresh random salt per wrap, and the user id is bound
 *             into the key material so a blob cannot be moved to another
 *             user's row and read there.
 *
 *   legacy-3  `<iv>:<tag>:<ciphertext>`. Written by registerDevice() with a
 *             constant salt and no user binding. Readable, so that rows
 *             written by that path stop being write-only (they had no reader
 *             at all before this change). Never written any more.
 *
 *   legacy-2  `<iv>:<ciphertext>`. Written by the BROWSER, wrapped under the
 *             KEK that crypto/backup.ts derives from NEXT_PUBLIC_SYSTEM_SECRET.
 *             The server deliberately does not unwrap these. That KEK is
 *             derivable by anyone, so treating such a blob as trustworthy
 *             key material would import the exact weakness this phase exists
 *             to remove. There should be none: the flow is inert because the
 *             variable is unset. If one appears, it is reported, not used.
 */
const BLOB_V2 = "v2";
const LEGACY_CONSTANT_SALT = "e2ee-salt";
const WRAP_KEY_BYTES = 32;
const GCM_IV_BYTES = 12;

export type StoredKeyFormat = "v2" | "legacy-3" | "legacy-2" | "unknown";

export class ServerSecretMissingError extends Error {
  constructor() {
    super(
      "E2EE_SERVER_SECRET is not configured. Refusing to handle private-key material without it.",
    );
  }
}

export class ClientWrappedKeyError extends Error {
  constructor() {
    super(
      "Stored private key is in the legacy browser-wrapped format and cannot be unwrapped server-side.",
    );
  }
}

@Injectable()
export class UserKeysService {
  private readonly logger = new Logger("UserKeys");

  constructor(
    @InjectRepository(UserKey)
    private readonly userKeyRepo: Repository<UserKey>,
    @InjectRepository(UserDevice)
    private readonly userDeviceRepo: Repository<UserDevice>,
  ) {}

  async registerDevice(
    userId: string,
    dto: RegisterDeviceDto,
  ): Promise<{ deviceId: string }> {
    const device = this.userDeviceRepo.create({
      userId,
      publicKey: dto.publicKey,
      deviceName: dto.deviceName,
    });
    const savedDevice = await this.userDeviceRepo.save(device);

    // Upsert UserKey if this is the first device (or if encryptedPrivateKey provided)
    const existingKey = await this.userKeyRepo.findOne({ where: { userId } });
    if (!existingKey) {
      const encryptedPrivateKey = dto.encryptedPrivateKey
        ? this.encryptPrivateKey(dto.encryptedPrivateKey)
        : undefined;

      const userKey = this.userKeyRepo.create({
        userId,
        publicKey: dto.publicKey,
        encryptedPrivateKey,
      });
      await this.userKeyRepo.save(userKey);
    } else if (dto.encryptedPrivateKey && !existingKey.encryptedPrivateKey) {
      existingKey.encryptedPrivateKey = this.encryptPrivateKey(
        dto.encryptedPrivateKey,
      );
      await this.userKeyRepo.save(existingKey);
    }

    return { deviceId: savedDevice.id };
  }

  async getEncryptedPrivateKey(
    userId: string,
  ): Promise<{ encryptedPrivateKey: string | null }> {
    const userKey = await this.userKeyRepo.findOne({ where: { userId } });
    return { encryptedPrivateKey: userKey?.encryptedPrivateKey ?? null };
  }

  async storeEncryptedPrivateKey(
    userId: string,
    encryptedPrivateKey: string,
    publicKey?: string,
  ): Promise<{ success: boolean }> {
    const existing = await this.userKeyRepo.findOne({ where: { userId } });
    if (existing) {
      existing.encryptedPrivateKey = encryptedPrivateKey;
      if (publicKey) existing.publicKey = publicKey;
      await this.userKeyRepo.save(existing);
    } else {
      await this.userKeyRepo.save(
        this.userKeyRepo.create({
          userId,
          publicKey: publicKey || "",
          encryptedPrivateKey,
        }),
      );
    }
    return { success: true };
  }

  // ───────────────────────────────────────────────────────────────────────
  // Server-side key custody (Security Tasklist item #2, Phase 1)
  //
  // The browser sends its private key PEM and gets it back; the key that
  // protects it at rest is derived here and never leaves this process. That
  // is the whole point of the phase: the previous design derived the
  // wrapping key in the browser from NEXT_PUBLIC_SYSTEM_SECRET, which is
  // compiled into the public bundle, so the "secret" protecting every
  // private key was published. Nothing about the trust model changes — the
  // server could always decrypt, and the spec says so — but the general
  // public no longer can.
  // ───────────────────────────────────────────────────────────────────────

  /**
   * Store a private key for recovery, encrypted at rest with a key only this
   * server can derive.
   *
   * Refuses to overwrite an existing backup unless the caller presents the
   * matching public key. Without that check a second browser, which has
   * generated its own unrelated keypair, would replace the backup that the
   * first browser's conversation keys are wrapped against, and the user's
   * message history would become permanently undecryptable. messaging-service
   * protects its public keys the same way.
   */
  async backupPrivateKey(
    userId: string,
    privateKeyPem: string,
    publicKeyPem: string,
  ): Promise<{ success: boolean; replaced: boolean }> {
    const existing = await this.userKeyRepo.findOne({ where: { userId } });

    if (existing?.encryptedPrivateKey && existing.publicKey) {
      if (!publicKeysMatch(existing.publicKey, publicKeyPem)) {
        this.logger.warn(
          `backup refused: userId=${userId} already has a backup under a different public key`,
        );
        throw new Error(
          "A private-key backup already exists for this account under a different public key. " +
            "Restore the existing key instead of overwriting it.",
        );
      }
    }

    const blob = this.wrapPrivateKey(userId, privateKeyPem);

    if (existing) {
      const replaced = Boolean(existing.encryptedPrivateKey);
      existing.encryptedPrivateKey = blob;
      existing.publicKey = publicKeyPem;
      await this.userKeyRepo.save(existing);
      return { success: true, replaced };
    }

    await this.userKeyRepo.save(
      this.userKeyRepo.create({
        userId,
        publicKey: publicKeyPem,
        encryptedPrivateKey: blob,
      }),
    );
    return { success: true, replaced: false };
  }

  /**
   * Return the caller's private key PEM, or null when there is no usable
   * backup. `null` is a normal answer — a user with no backup yet, or one
   * holding only a browser-wrapped legacy blob — and the client should
   * respond by keeping or generating its local keypair, never by treating it
   * as an error state.
   */
  async restorePrivateKey(
    userId: string,
  ): Promise<{ privateKey: string | null; format: StoredKeyFormat }> {
    const userKey = await this.userKeyRepo.findOne({ where: { userId } });
    const blob = userKey?.encryptedPrivateKey;
    if (!blob) return { privateKey: null, format: "unknown" };

    const format = detectFormat(blob);

    if (format === "legacy-2") {
      // Not an error the caller can fix, and not something to unwrap.
      this.logger.warn(
        `restore: userId=${userId} holds a browser-wrapped (legacy-2) backup; refusing to use it`,
      );
      return { privateKey: null, format };
    }

    if (format === "unknown") {
      this.logger.error(
        `restore: userId=${userId} has a private-key blob in an unrecognised format`,
      );
      return { privateKey: null, format };
    }

    const privateKey = this.unwrapPrivateKey(userId, blob, format);
    return { privateKey, format };
  }

  /** Whether a usable server-side backup exists, without decrypting it. */
  async backupStatus(
    userId: string,
  ): Promise<{ hasBackup: boolean; format: StoredKeyFormat }> {
    const userKey = await this.userKeyRepo.findOne({ where: { userId } });
    const blob = userKey?.encryptedPrivateKey;
    if (!blob) return { hasBackup: false, format: "unknown" };
    const format = detectFormat(blob);
    return { hasBackup: format === "v2" || format === "legacy-3", format };
  }

  // ── wrapping internals ────────────────────────────────────────────────

  private serverSecret(): string {
    const secret = process.env.E2EE_SERVER_SECRET;
    if (!secret) throw new ServerSecretMissingError();
    return secret;
  }

  /**
   * scrypt over the server secret bound to the user id, with a fresh random
   * salt per wrap. scrypt rather than HKDF because E2EE_SERVER_SECRET is
   * operator-supplied and its entropy cannot be assumed; the default cost
   * parameters are kept so memory use stays inside Node's default maxmem.
   */
  private deriveWrapKey(userId: string, salt: Buffer): Buffer {
    return crypto.scryptSync(
      `${this.serverSecret()}:${userId}`,
      salt,
      WRAP_KEY_BYTES,
    );
  }

  private wrapPrivateKey(userId: string, plaintext: string): string {
    const salt = crypto.randomBytes(16);
    const iv = crypto.randomBytes(GCM_IV_BYTES);
    const cipher = crypto.createCipheriv(
      "aes-256-gcm",
      this.deriveWrapKey(userId, salt),
      iv,
    );
    const ciphertext = Buffer.concat([
      cipher.update(plaintext, "utf8"),
      cipher.final(),
    ]);
    return [
      BLOB_V2,
      salt.toString("base64"),
      iv.toString("base64"),
      cipher.getAuthTag().toString("base64"),
      ciphertext.toString("base64"),
    ].join(":");
  }

  private unwrapPrivateKey(
    userId: string,
    blob: string,
    format: StoredKeyFormat,
  ): string {
    const parts = blob.split(":");

    let key: Buffer;
    let iv: Buffer;
    let authTag: Buffer;
    let ciphertext: Buffer;

    if (format === "v2") {
      const [, saltB64, ivB64, tagB64, ctB64] = parts;
      key = this.deriveWrapKey(userId, Buffer.from(saltB64, "base64"));
      iv = Buffer.from(ivB64, "base64");
      authTag = Buffer.from(tagB64, "base64");
      ciphertext = Buffer.from(ctB64, "base64");
    } else if (format === "legacy-3") {
      // registerDevice()'s format: constant salt, no user binding.
      const [ivB64, tagB64, ctB64] = parts;
      key = crypto.scryptSync(
        this.serverSecret(),
        LEGACY_CONSTANT_SALT,
        WRAP_KEY_BYTES,
      );
      iv = Buffer.from(ivB64, "base64");
      authTag = Buffer.from(tagB64, "base64");
      ciphertext = Buffer.from(ctB64, "base64");
    } else {
      throw new ClientWrappedKeyError();
    }

    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(authTag);
    return Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]).toString("utf8");
  }

  /**
   * @deprecated Legacy wrap used only by registerDevice(). Constant salt, no
   * user binding, and the rows it writes are readable only through
   * unwrapPrivateKey()'s legacy-3 branch. Left in place because
   * registerDevice() is live; new writes go through wrapPrivateKey().
   */
  private encryptPrivateKey(plaintext: string): string {
    const secret = process.env.E2EE_SERVER_SECRET;
    if (!secret) {
      throw new Error(
        "E2EE_SERVER_SECRET is not configured. Refusing to store private-key material without it.",
      );
    }

    const key = crypto.scryptSync(secret, LEGACY_CONSTANT_SALT, WRAP_KEY_BYTES);
    const iv = crypto.randomBytes(GCM_IV_BYTES);
    const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
    const encrypted = Buffer.concat([
      cipher.update(plaintext, "utf8"),
      cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();

    return `${iv.toString("base64")}:${authTag.toString("base64")}:${encrypted.toString("base64")}`;
  }
}

/** Shape-based, so a row's format is never guessed from when it was written. */
export function detectFormat(blob: string): StoredKeyFormat {
  const parts = blob.split(":");
  if (parts[0] === BLOB_V2) {
    // A truncated v2 blob has three parts and would otherwise be read as
    // legacy-3, decrypted with the wrong key, and fail with a misleading
    // auth-tag error. Claiming to be v2 and not being v2 is corruption.
    return parts.length === 5 ? "v2" : "unknown";
  }
  if (parts.length === 3) return "legacy-3";
  if (parts.length === 2) return "legacy-2";
  return "unknown";
}

/** PEMs differ by line wrapping and trailing newlines far more often than by content. */
function publicKeysMatch(a: string, b: string): boolean {
  const normalise = (pem: string) => pem.replace(/\s+/g, "");
  const left = Buffer.from(normalise(a));
  const right = Buffer.from(normalise(b));
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}
