import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { BlockedUser } from './blocked-users.entity';
import { User } from '../user/entities/user.entity';
import { CreateBlockDto } from './dto/create-block.dto';
import {
  BlockedUserDto,
  BlockPairStatusDto,
  BlockStatusDto,
} from './dto/block-status.dto';

@Injectable()
export class BlockedUsersService {
  constructor(
    @InjectRepository(BlockedUser)
    private readonly blockedUsersRepository: Repository<BlockedUser>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  private toDto(row: BlockedUser): BlockedUserDto {
    return {
      id: row.id,
      blockedId: row.blockedId,
      reason: row.reason,
      createdAt: row.createdAt.toISOString(),
    };
  }

  async block(
    blockerId: string,
    blockedId: string,
    dto: CreateBlockDto,
  ): Promise<BlockedUserDto> {
    if (blockerId === blockedId) {
      throw new BadRequestException('Cannot block yourself');
    }

    const target = await this.userRepository.findOne({
      where: { id: blockedId },
    });
    if (!target) {
      throw new NotFoundException('User not found');
    }

    const row = this.blockedUsersRepository.create({
      blockerId,
      blockedId,
      reason: dto.reason ?? null,
    });

    try {
      const saved = await this.blockedUsersRepository.save(row);
      return this.toDto(saved);
    } catch (err) {
      if (
        err instanceof QueryFailedError &&
        (err as QueryFailedError & { code?: string }).code === '23505'
      ) {
        throw new ConflictException('User is already blocked');
      }
      throw err;
    }
  }

  async unblock(blockerId: string, blockedId: string): Promise<{ message: string }> {
    const existing = await this.blockedUsersRepository.findOne({
      where: { blockerId, blockedId },
    });
    if (!existing) {
      throw new NotFoundException('No active block to remove');
    }
    await this.blockedUsersRepository.remove(existing);
    return { message: 'User unblocked' };
  }

  async listBlocked(blockerId: string): Promise<BlockedUserDto[]> {
    const rows = await this.blockedUsersRepository.find({
      where: { blockerId },
      order: { createdAt: 'DESC' },
    });
    return rows.map((r) => this.toDto(r));
  }

  async getStatus(blockerId: string, blockedId: string): Promise<BlockStatusDto> {
    const existing = await this.blockedUsersRepository.findOne({
      where: { blockerId, blockedId },
    });
    if (!existing) {
      return { blocked: false };
    }
    return {
      blocked: true,
      blockedAt: existing.createdAt.toISOString(),
    };
  }

  async getPairStatus(
    userA: string,
    userB: string,
  ): Promise<BlockPairStatusDto> {
    const rows = await this.blockedUsersRepository.find({
      where: [
        { blockerId: userA, blockedId: userB },
        { blockerId: userB, blockedId: userA },
      ],
    });
    return {
      aBlockedB: rows.some(
        (r) => r.blockerId === userA && r.blockedId === userB,
      ),
      bBlockedA: rows.some(
        (r) => r.blockerId === userB && r.blockedId === userA,
      ),
    };
  }

  async listBlockedIds(blockerId: string): Promise<string[]> {
    const rows = await this.blockedUsersRepository.find({
      where: { blockerId },
      select: { blockedId: true },
    });
    return rows.map((r) => r.blockedId);
  }
}
