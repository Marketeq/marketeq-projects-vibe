import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { HireRequests } from './hire-requests.entity';
import { CreateHireRequestDto } from './dtos/create-hire-request.dto';
import { Repository } from 'typeorm';
import { User } from '../user/entities/user.entity';
import { UserRole } from '../user/enums/user-role.enum';
import { UpdateHireRequestDto } from './dtos/update-hire-request.dto';
import { HireStatus } from './enums/hire-status.enums';
import {
  FindHireRequestsQueryDto,
  HireRequestRole,
} from './dtos/find-hire-requests-query.dto';
import { UpdateHireStatusDto } from './dtos/update-hire-status.dto';

@Injectable()
export class HireRequestsService {
  constructor(
    @InjectRepository(HireRequests)
    private readonly hireRequestsRepository: Repository<HireRequests>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(dto: CreateHireRequestDto) {
    if (!dto.clientUserId) {
      throw new BadRequestException('clientUserId is required');
    }
    const clientUser = await this.userRepository.findOne({
      where: { id: dto.clientUserId },
    });
    const talentUser = await this.userRepository.findOne({
      where: { id: dto.talentUserId },
    });

    if (!clientUser) {
      throw new NotFoundException(
        `Client user with ID ${dto.clientUserId} not found`,
      );
    }
    if (!talentUser) {
      throw new NotFoundException(
        `Talent user with ID ${dto.talentUserId} not found`,
      );
    }

    if (clientUser.role !== UserRole.CLIENT) {
      throw new BadRequestException(
        `User with ID ${dto.clientUserId} is not a client`,
      );
    }
    if (talentUser.role !== UserRole.TALENT) {
      throw new BadRequestException(
        `User with ID ${dto.talentUserId} is not a talent`,
      );
    }
    const hireRequest = this.hireRequestsRepository.create(dto);
    return this.hireRequestsRepository.save(hireRequest);
  }

  async update(id: string, dto: UpdateHireRequestDto) {
    const hireRequest = await this.hireRequestsRepository.findOne({
      where: { id },
    });
    if (!hireRequest) {
      throw new NotFoundException(`Hire request not found`);
    }
    Object.assign(hireRequest, dto);
    return this.hireRequestsRepository.save(hireRequest);
  }

  async findOne(id: string) {
    const hireRequest = await this.hireRequestsRepository.findOne({
      where: { id },
    });
    if (!hireRequest) {
      throw new NotFoundException(`Hire request not found`);
    }
    return hireRequest;
  }

  async findAll(userId: string, query: FindHireRequestsQueryDto) {
    const where: Record<string, unknown> = {};

    if (query.role === HireRequestRole.CLIENT) {
      where.clientUserId = userId;
    } else if (query.role === HireRequestRole.TALENT) {
      where.talentUserId = userId;
    } else {
      // no role filter — return all requests involving this user
      // handled via two queries merged
      const [asClient, asTalent] = await Promise.all([
        this.hireRequestsRepository.find({
          where: {
            clientUserId: userId,
            ...(query.status ? { status: query.status } : {}),
          },
          order: { createdAt: 'DESC' },
        }),
        this.hireRequestsRepository.find({
          where: {
            talentUserId: userId,
            ...(query.status ? { status: query.status } : {}),
          },
          order: { createdAt: 'DESC' },
        }),
      ]);
      return [...asClient, ...asTalent].sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
      );
    }

    if (query.status) {
      where.status = query.status;
    }

    return this.hireRequestsRepository.find({
      where,
      order: { createdAt: 'DESC' },
    });
  }

  async updateStatus(id: string, dto: UpdateHireStatusDto) {
    const hireRequest = await this.hireRequestsRepository.findOne({
      where: { id },
    });
    if (!hireRequest) {
      throw new NotFoundException(`Hire request not found`);
    }
    hireRequest.status = dto.status;
    await this.hireRequestsRepository.save(hireRequest);
    return { id: hireRequest.id, status: hireRequest.status };
  }
}
