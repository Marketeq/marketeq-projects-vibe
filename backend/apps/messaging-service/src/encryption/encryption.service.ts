import * as crypto from "crypto";
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { EntityManager, In, Repository } from "typeorm";
import { UserPublicKey } from "./entities/user-public-key.entity";
import { ConversationKey } from "./entities/conversation-key.entity";
import { ConversationRawKey } from "./entities/conversation-raw-key.entity";
import { Thread } from "../threads/entities/thread.entity";

@Injectable()
export class EncryptionService {
  private readonly serverKey: Buffer;

  constructor(
    @InjectRepository(UserPublicKey)
    private readonly publicKeyRepo: Repository<UserPublicKey>,
    @InjectRepository(ConversationKey)
    private readonly convKeyRepo: Repository<ConversationKey>,
    @InjectRepository(ConversationRawKey)
    private readonly rawKeyRepo: Repository<ConversationRawKey>,
    @InjectRepository(Thread)
    private readonly threadRepo: Repository<Thread>,
  ) {
    const secret = process.env.E2EE_SERVER_SECRET;
    if (!secret) {
      throw new Error("E2EE_SERVER_SECRET environment variable is required");
    }
    this.serverKey = crypto.createHash("sha256").update(secret).digest();
  }

  async storePublicKey(
    userId: string,
    publicKey: string,
  ): Promise<UserPublicKey> {
    const normalizedIncomingKey = publicKey.trim();
    if (!this.isValidPublicKey(normalizedIncomingKey)) {
      throw new BadRequestException("Invalid public key");
    }

    const existing = await this.publicKeyRepo.findOne({ where: { userId } });
    if (!existing) {
      return this.publicKeyRepo.save(
        this.publicKeyRepo.create({ userId, publicKey: normalizedIncomingKey }),
      );
    }

    const currentKey = existing.publicKey.trim();
    if (
      this.normalizeKey(currentKey) === this.normalizeKey(normalizedIncomingKey)
    ) {
      return existing;
    }

    return this.publicKeyRepo.manager.transaction(async (manager) => {
      const publicKeyRepo = manager.getRepository(UserPublicKey);
      const publicKeyRecord = await publicKeyRepo.findOne({
        where: { userId },
      });
      if (!publicKeyRecord) {
        return publicKeyRepo.save(
          publicKeyRepo.create({ userId, publicKey: normalizedIncomingKey }),
        );
      }

      const existingKeyIsInvalid = !this.isValidPublicKey(
        publicKeyRecord.publicKey,
      );
      if (!existingKeyIsInvalid) {
        await this.rewrapConversationKeysForUser(
          manager,
          userId,
          normalizedIncomingKey,
        );
      }

      publicKeyRecord.publicKey = normalizedIncomingKey;
      return publicKeyRepo.save(publicKeyRecord);
    });
  }

  async getPublicKey(userId: string): Promise<string | null> {
    const record = await this.publicKeyRepo.findOne({ where: { userId } });
    return record?.publicKey ?? null;
  }

  async getConversationKey(
    threadId: string,
    userId: string,
    _isGroup: boolean,
  ): Promise<string> {
    // 0. Verify user is a participant of this thread
    const thread = await this.threadRepo.findOne({ where: { id: threadId } });
    if (!thread) throw new NotFoundException("Thread not found");
    if (!thread.participantIds.includes(userId)) {
      throw new ForbiddenException("Not a participant of this thread");
    }

    // 1. Check if wrapped key already exists for this user + thread
    const existing = await this.convKeyRepo.findOne({
      where: { threadId, userId },
    });
    if (existing) {
      return existing.encryptedKey;
    }

    // 2. Get user's public key (required to wrap)
    const userPubKey = await this.publicKeyRepo.findOne({ where: { userId } });
    if (!userPubKey) {
      throw new NotFoundException(
        "User public key not found. Client must upload a public key first.",
      );
    }

    // 3. Get or create the raw AES key for this conversation
    let aesKeyBuffer: Buffer;
    const rawKeyRecord = await this.rawKeyRepo.findOne({ where: { threadId } });

    if (rawKeyRecord) {
      aesKeyBuffer = this.decryptServerSide(rawKeyRecord.encryptedAesKey);
    } else {
      aesKeyBuffer = crypto.randomBytes(32);
      const encryptedAesKey = this.encryptServerSide(aesKeyBuffer);
      await this.rawKeyRepo.save(
        this.rawKeyRepo.create({ threadId, encryptedAesKey }),
      );
    }

    // 4. Wrap AES key with user's RSA public key
    const wrappedKey = this.wrapWithRsa(userPubKey.publicKey, aesKeyBuffer);

    // 5. Store the wrapped key
    await this.convKeyRepo.save(
      this.convKeyRepo.create({ threadId, userId, encryptedKey: wrappedKey }),
    );

    return wrappedKey;
  }

  private wrapWithRsa(publicKeyInput: string, aesKeyBuffer: Buffer): string {
    const pem = this.normalizePublicKey(publicKeyInput);

    const wrappedKey = crypto.publicEncrypt(
      {
        key: pem,
        oaepHash: "sha256",
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      },
      aesKeyBuffer,
    );
    return wrappedKey.toString("base64");
  }

  private normalizePublicKey(publicKeyInput: string): string {
    let pem = publicKeyInput.trim();
    if (!pem.includes("-----BEGIN")) {
      const body = pem.replace(/\s+/g, "");
      const lines = body.match(/.{1,64}/g)?.join("\n") || body;
      pem = `-----BEGIN PUBLIC KEY-----\n${lines}\n-----END PUBLIC KEY-----\n`;
    }
    return pem;
  }

  private normalizeKey(publicKeyInput: string): string {
    return this.normalizePublicKey(publicKeyInput).replace(/\s+/g, "");
  }

  private isValidPublicKey(publicKeyInput: string): boolean {
    try {
      crypto.createPublicKey(this.normalizePublicKey(publicKeyInput));
      return true;
    } catch {
      return false;
    }
  }

  private async rewrapConversationKeysForUser(
    manager: EntityManager,
    userId: string,
    nextPublicKey: string,
  ): Promise<void> {
    const convKeyRepo = manager.getRepository(ConversationKey);
    const rawKeyRepo = manager.getRepository(ConversationRawKey);

    const conversationKeys = await convKeyRepo.find({ where: { userId } });
    if (!conversationKeys.length) return;

    const threadIds = [...new Set(conversationKeys.map((key) => key.threadId))];
    const rawKeys = await rawKeyRepo.find({
      where: { threadId: In(threadIds) },
    });
    const rawKeyByThread = new Map(rawKeys.map((key) => [key.threadId, key]));

    const missingThreadIds = threadIds.filter((id) => !rawKeyByThread.has(id));
    if (missingThreadIds.length) {
      // Threads without stored raw AES material (e.g. group threads whose key
      // was distributed client-side) can't be rewrapped server-side. Rotating
      // the public key must still succeed for the rest — otherwise a single
      // such thread would permanently block key recovery for every other
      // thread — so skip them here instead of aborting the whole rotation.
      console.warn(
        `[EncryptionService] Skipping rewrap for ${missingThreadIds.length} thread(s) missing raw key material during key rotation for user ${userId}`,
      );
    }

    const rewrapped: ConversationKey[] = [];
    for (const conversationKey of conversationKeys) {
      const rawKey = rawKeyByThread.get(conversationKey.threadId);
      if (!rawKey) continue;
      const aesKeyBuffer = this.decryptServerSide(rawKey.encryptedAesKey);
      conversationKey.encryptedKey = this.wrapWithRsa(
        nextPublicKey,
        aesKeyBuffer,
      );
      rewrapped.push(conversationKey);
    }

    if (rewrapped.length) {
      await convKeyRepo.save(rewrapped);
    }
  }

  async deleteConversationKeyForUser(threadId: string, userId: string): Promise<void> {
    await this.convKeyRepo.delete({ threadId, userId });
  }

  private encryptServerSide(data: Buffer): string {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", this.serverKey, iv);
    const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
    const authTag = cipher.getAuthTag();
    // Store as iv:authTag:ciphertext, all base64
    return [
      iv.toString("base64"),
      authTag.toString("base64"),
      encrypted.toString("base64"),
    ].join(":");
  }

  private decryptServerSide(stored: string): Buffer {
    const [ivB64, tagB64, dataB64] = stored.split(":");
    const iv = Buffer.from(ivB64, "base64");
    const authTag = Buffer.from(tagB64, "base64");
    const encrypted = Buffer.from(dataB64, "base64");
    const decipher = crypto.createDecipheriv("aes-256-gcm", this.serverKey, iv);
    decipher.setAuthTag(authTag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]);
  }
}
