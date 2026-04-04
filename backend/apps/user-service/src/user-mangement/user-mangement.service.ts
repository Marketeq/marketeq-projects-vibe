import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '../user/entities/user.entity';
import { Repository } from 'typeorm';
import { CheckUsernameDto } from './dtos/check-username.dto';
import { UpdateUsernameDto } from './dtos/update-username.dto';
import { UsernameAvailabilityResponseDto } from './dtos/username-availability-response.dto';
import { UpdateUsernameResponseDto } from './dtos/update-username-response.dto';

@Injectable()
export class UserMangementService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async isUsernameTaken(
    dto: CheckUsernameDto,
  ): Promise<UsernameAvailabilityResponseDto> {
    const user = await this.userRepository.findOne({
      where: { username: dto.username },
    });

    return { username: dto.username, available: !user };
  }

  async updateUsername(
    id: string,
    dto: UpdateUsernameDto,
  ): Promise<UpdateUsernameResponseDto> {
    const [user, existing] = await Promise.all([
      this.userRepository.findOne({ where: { id } }),
      this.userRepository.findOne({ where: { username: dto.username } }),
    ]);

    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (existing && existing.id !== id) {
      throw new ConflictException('Username is already taken');
    }

    user.username = dto.username;
    await this.userRepository.save(user);
    return { userId: user.id, username: user.username };
  }
}
