import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';

import { CreateClientDto } from './dto/create-client.dto';
import { ClientProfile } from './client.entity';
import { User } from '../user/entities/user.entity';
import { UserRole } from '../user/enums/user-role.enum';

@Injectable()
export class ClientService {
  constructor(private readonly dataSource: DataSource) {}

  async createClient(
    userId: string,
    dto: CreateClientDto,
  ): Promise<ClientProfile> {
    return this.dataSource.transaction(async (manager) => {
      const userRepository = manager.getRepository(User);
      const clientRepository = manager.getRepository(ClientProfile);

      const user = await userRepository.findOne({ where: { id: userId } });
      if (!user) {
        throw new NotFoundException('User not found');
      }

      const existingClient = await clientRepository.findOne({
        where: { userId },
      });

      if (existingClient) {
        throw new UnprocessableEntityException('Client already exists');
      }

      const existingUsername = await userRepository.findOne({
        where: { username: dto.username },
      });

      if (existingUsername && existingUsername.id !== userId) {
        throw new BadRequestException('Username already exists');
      }

      Object.assign(user, {
        role: UserRole.CLIENT,
        username: dto.username,
        firstName: dto.firstName,
        lastName: dto.lastName,
        avatarUrl: dto.avatarUrl ?? user.avatarUrl,
        lookingToWorkWith: dto.lookingToWorkWith,
        projectTypes: dto.projectTypes,
      });

      await userRepository.save(user);

      const created = clientRepository.create({
        userId,
        teamName: dto.teamName,
        role: dto.role,
        industry: dto.industry,
        businessTypes: dto.businessTypes,
        teammateEmails: dto.teammateEmails,
        industries: dto.industries,
        lookingToWorkWith: dto.lookingToWorkWith,
        skills: dto.skills,
        projectTypes: dto.projectTypes,
        budget: dto.budget,
      });

      const saved = await clientRepository.save(created);
      const hydrated = await clientRepository.findOne({
        where: { id: saved.id },
      });
      return hydrated ?? saved;
    });
  }
}
