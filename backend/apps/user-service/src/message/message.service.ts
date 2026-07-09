import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../user/entities/user.entity';
import { ConversationThread } from './conversation-thread.entity';
import { Message } from './message.entity';
import { CreateThreadDto } from './dtos/create-thread.dto';
import { ThreadResponseDto } from './dtos/thread-response.dto';
import { UserRole } from '../user/enums/user-role.enum';

@Injectable()
export class MessageService {
  constructor(
    @InjectRepository(ConversationThread)
    private readonly threadRepository: Repository<ConversationThread>,
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async createOrGetThread(dto: CreateThreadDto): Promise<ThreadResponseDto> {
    const { clientUserId, talentUserId, initialMessage } = dto;

    if (clientUserId === talentUserId) {
      throw new BadRequestException(
        'Client and talent cannot be the same user',
      );
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

    // Idempotent: return existing thread if already created
    const existing = await this.threadRepository.findOne({
      where: { clientUserId, talentUserId },
    });

    if (existing) {
      return { threadId: existing.threadId, created: false };
    }

    // Create new thread
    const thread = this.threadRepository.create({
      clientUserId,
      talentUserId,
    });
    const savedThread = await this.threadRepository.save(thread);
    const threadId = savedThread.threadId;

    // Persist initialMessage as the first message in the thread
    if (initialMessage) {
      const message = this.messageRepository.create({
        threadId,
        clientUserId,
        talentUserId,
        content: initialMessage,
      });
      await this.messageRepository.save(message);
    }

    return { threadId, created: true };
  }
}
