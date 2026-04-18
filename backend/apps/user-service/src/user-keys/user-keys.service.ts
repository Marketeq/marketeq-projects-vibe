import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { UserKey } from './entities/user-key.entity';
import { UserDevice } from './entities/user-device.entity';
import { RegisterDeviceDto } from './dtos/register-device.dto';

@Injectable()
export class UserKeysService {
  private readonly logger = new Logger(UserKeysService.name);

  constructor(
    @InjectRepository(UserKey)
    private readonly userKeyRepo: Repository<UserKey>,
    @InjectRepository(UserDevice)
    private readonly userDeviceRepo: Repository<UserDevice>,
  ) {}

  async getUserKeys(userId: string): Promise<{ publicKey: string; privateKeyPem: string }> {
    const userKey = await this.userKeyRepo.findOne({ where: { userId } });
    if (!userKey) {
      return { publicKey: '', privateKeyPem: '' };
    }

    const privateKeyPem = userKey.encryptedPrivateKey
      ? this.decryptPrivateKey(userKey.encryptedPrivateKey)
      : '';

    return { publicKey: userKey.publicKey, privateKeyPem };
  }

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
      existingKey.encryptedPrivateKey = this.encryptPrivateKey(dto.encryptedPrivateKey);
      await this.userKeyRepo.save(existingKey);
    }

    return { deviceId: savedDevice.id };
  }

  async getPublicKey(userId: string): Promise<string> {
    const userKey = await this.userKeyRepo.findOne({ where: { userId } });
    return userKey?.publicKey ?? '';
  }

  async getEncryptedPrivateKey(userId: string): Promise<{ encryptedPrivateKey: string | null }> {
    const userKey = await this.userKeyRepo.findOne({ where: { userId } });
    return { encryptedPrivateKey: userKey?.encryptedPrivateKey ?? null };
  }

  async storeEncryptedPrivateKey(userId: string, encryptedPrivateKey: string, publicKey?: string): Promise<{ success: boolean }> {
    const existing = await this.userKeyRepo.findOne({ where: { userId } });
    if (existing) {
      existing.encryptedPrivateKey = encryptedPrivateKey;
      if (publicKey) existing.publicKey = publicKey;
      await this.userKeyRepo.save(existing);
    } else {
      await this.userKeyRepo.save(this.userKeyRepo.create({
        userId,
        publicKey: publicKey || '',
        encryptedPrivateKey,
      }));
    }
    return { success: true };
  }

  private encryptPrivateKey(plaintext: string): string {
    const secret = process.env.E2EE_SERVER_SECRET;
    if (!secret) {
      // Dev mode: store as-is
      return plaintext;
    }

    const key = crypto.scryptSync(secret, 'e2ee-salt', 32);
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();

    // Format: base64(iv):base64(authTag):base64(encrypted)
    return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted.toString('base64')}`;
  }

  private decryptPrivateKey(ciphertext: string): string {
    const secret = process.env.E2EE_SERVER_SECRET;
    if (!secret) {
      // Dev mode: stored as-is
      return ciphertext;
    }

    try {
      const parts = ciphertext.split(':');
      if (parts.length !== 3) {
        // Not encrypted (legacy or dev data), return as-is
        return ciphertext;
      }

      const iv = Buffer.from(parts[0], 'base64');
      const authTag = Buffer.from(parts[1], 'base64');
      const encrypted = Buffer.from(parts[2], 'base64');

      const key = crypto.scryptSync(secret, 'e2ee-salt', 32);
      const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
      decipher.setAuthTag(authTag);
      const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);

      return decrypted.toString('utf8');
    } catch (err) {
      this.logger.warn('Failed to decrypt private key, returning as-is');
      return ciphertext;
    }
  }
}
