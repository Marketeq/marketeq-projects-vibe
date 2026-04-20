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
import { UserService } from '../user/user.service';

@Injectable()
export class ClientService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly userService: UserService,
  ) {}

  async createClient(
    userClaims: { id: string; email?: string },
    dto: CreateClientDto,
  ): Promise<ClientProfile> {
    return this.dataSource.transaction(async (manager) => {
      const userRepository = manager.getRepository(User);
      const clientRepository = manager.getRepository(ClientProfile);

      let user = await userRepository.findOne({ where: { id: userClaims.id } });
      if (!user && userClaims.email) {
        user = await userRepository.findOne({ where: { email: userClaims.email } });
      }
      if (!user && userClaims.id && userClaims.email) {
        await this.userService.syncFromAuth({
          id: userClaims.id,
          email: userClaims.email,
        });
        user = await userRepository.findOne({ where: { id: userClaims.id } });
      }

      if (!user) {
        throw new NotFoundException('User not found');
      }

      const existingClient = await clientRepository.findOne({
        where: { userId: user.id },
      });

      if (existingClient) {
        throw new UnprocessableEntityException('Client already exists');
      }

      // Only enforce uniqueness when a username was actually supplied.
      // `dto.username` is optional; passing `undefined` into the where clause
      // matches rows with NULL usernames and would produce a spurious
      // "Username already exists" error for any other user without a
      // username set.
      if (dto.username) {
        const existingUsername = await userRepository.findOne({
          where: { username: dto.username },
        });

        if (existingUsername && existingUsername.id !== user.id) {
          throw new BadRequestException('Username already exists');
        }
      }

      Object.assign(user, {
        userType: 'client',
        firstName: dto.firstName,
        lastName: dto.lastName,
        avatarUrl: dto.avatarUrl ?? user.avatarUrl,
        lookingToWorkWith: dto.lookingToWorkWith,
        projectTypes: dto.projectTypes,
        ...(dto.username ? { username: dto.username } : {}),
      });

      await userRepository.save(user);

      const created = clientRepository.create({
        userId: user.id,
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
