import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DeviceRegistration } from '../entities/device-registration.entity';
import { RegisterDeviceDto } from './dto/register-device.dto';

@Injectable()
export class DevicesService {
  constructor(
    @InjectRepository(DeviceRegistration) private readonly repo: Repository<DeviceRegistration>,
  ) {}
 
  async register(userId: string, dto: RegisterDeviceDto): Promise<DeviceRegistration> {
    // Upsert by installation UUID
    const existing = await this.repo.findOneBy({ installationUuid: dto.installationUuid });
    if (existing) {
      existing.appVersion = dto.appVersion;
      existing.osVersion = dto.osVersion;
      existing.lastSeenAt = new Date();
      return this.repo.save(existing);
    }
 
    return this.repo.save(this.repo.create({
      id: dto.id,
      userId,
      installationUuid: dto.installationUuid,
      osName: dto.osName,
      osVersion: dto.osVersion,
      appVersion: dto.appVersion,
      arch: dto.arch,
      lastSeenAt: new Date(),
    }));
  }
 
  async heartbeat(deviceId: string): Promise<{ ok: true }> {
    await this.repo.update(deviceId, { lastSeenAt: new Date() });
    return { ok: true };
  }
 
  async findByUser(userId: string): Promise<DeviceRegistration[]> {
    return this.repo.find({ where: { userId }, order: { lastSeenAt: 'DESC' } });
  }
}